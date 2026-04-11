import { ChatRole } from '@prisma/client';
import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError, notFound } from '../utils/http';

type ConversationMessage = {
  role: ChatRole;
  content: string;
};

type JuliaSourceRefs = {
  runbookIds: number[];
  projectDocIds: number[];
  supportTopicIds?: number[];
};

const MAX_CONTEXT_ITEMS = 2;
const MAX_SECTION_CONTEXT_CHARS = 2_400;
const MAX_ITEM_CONTEXT_CHARS = 900;
const MAX_CONVERSATION_MESSAGES = 6;
const MAX_CONVERSATION_MESSAGE_CHARS = 500;

const truncateContext = (value: string, maxChars: number) => (value.length > maxChars ? `${value.slice(0, maxChars)}...` : value);

const buildContextSection = (label: string, items: Array<{ title: string; content: string }>) => {
  if (!items.length) {
    return `${label}:\n- None available`;
  }

  let consumedChars = 0;
  const entries: string[] = [];

  for (const [index, item] of items.entries()) {
    const title = truncateContext(item.title, 120);
    const remainingChars = MAX_SECTION_CONTEXT_CHARS - consumedChars;

    if (remainingChars <= 0) {
      break;
    }

    const content = truncateContext(item.content, Math.min(MAX_ITEM_CONTEXT_CHARS, remainingChars));
    const entry = `- ${index + 1}. ${title}\n${content}`;
    consumedChars += entry.length;
    entries.push(entry);
  }

  return `${label}:\n${entries.join('\n\n')}`;
};

const scoreKnowledgeItem = (query: string, item: { title: string; content: string }) => {
  const haystack = `${item.title}\n${item.content}`.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  if (terms.length === 0) {
    return 0;
  }

  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
};

const normalizeConversation = (conversation: ConversationMessage[]) => {
  const dedupedConversation: ConversationMessage[] = [];

  for (const message of conversation) {
    const normalizedContent = message.content.trim();

    if (!normalizedContent) {
      continue;
    }

    const previousMessage = dedupedConversation[dedupedConversation.length - 1];

    if (previousMessage && previousMessage.role === message.role && previousMessage.content.trim() === normalizedContent) {
      continue;
    }

    dedupedConversation.push({
      role: message.role,
      content: truncateContext(normalizedContent, MAX_CONVERSATION_MESSAGE_CHARS),
    });
  }

  return dedupedConversation.slice(-MAX_CONVERSATION_MESSAGES);
};

const buildFallbackReply = (project: {
  juliaFallbackMessage: string | null;
  juliaEscalationHint: string | null;
}) =>
  [project.juliaFallbackMessage?.trim() || 'I do not have enough approved project context to answer confidently right now.', project.juliaEscalationHint?.trim()]
    .filter(Boolean)
    .join(' ');

const isPromptBudgetError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return ['request too large', 'tokens per minute', 'rate_limit_exceeded'].some((pattern) =>
    error.message.toLowerCase().includes(pattern),
  );
};

export const generateJuliaReply = async (projectId: number, conversation: ConversationMessage[]) => {
  if (!env.GROQ_API_KEY) {
    throw new AppError(500, 'GROQ_API_KEY is not configured for Julia AI.');
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      docs: {
        where: {
          status: 'PUBLISHED',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      },
    },
  });

  if (!project) {
    throw notFound('Project not found.');
  }

  const runbooks = await prisma.runbook.findMany({
    where: {
      status: 'PUBLISHED',
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 6,
  });

  const normalizedConversation = normalizeConversation(conversation);
  const latestUserMessage = [...normalizedConversation].reverse().find((message) => message.role === ChatRole.USER)?.content || '';
  const rankedDocs = project.docs
    .map((doc) => ({ ...doc, score: scoreKnowledgeItem(latestUserMessage, doc) }))
    .sort((left, right) => right.score - left.score || right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, MAX_CONTEXT_ITEMS);
  const rankedRunbooks = runbooks
    .map((runbook) => ({ ...runbook, score: scoreKnowledgeItem(latestUserMessage, runbook) }))
    .sort((left, right) => right.score - left.score || right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, MAX_CONTEXT_ITEMS);

  const systemPrompt = [
    `You are Julia, the support assistant for the "${project.name}" project.`,
    'Answer using only the provided project context when possible.',
    'If the context is insufficient, say that you are not certain and recommend escalating to a human.',
    'Keep answers concise, practical, and suitable for an IT support widget.',
    project.juliaGreeting ? `Preferred greeting: ${project.juliaGreeting}` : '',
    project.juliaFallbackMessage ? `Fallback message: ${project.juliaFallbackMessage}` : '',
    project.juliaEscalationHint ? `Escalation hint: ${project.juliaEscalationHint}` : '',
    buildContextSection(
      'Project Documents',
      rankedDocs.map((doc) => ({
        title: doc.title,
        content: doc.content,
      })),
    ),
    buildContextSection(
      'Runbooks',
      rankedRunbooks.map((runbook) => ({
        title: runbook.title,
        content: runbook.content,
      })),
    ),
  ]
    .filter(Boolean)
    .join('\n\n');

  const client = new Groq({
    apiKey: env.GROQ_API_KEY,
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...normalizedConversation.map<ChatCompletionMessageParam>((message) =>
      message.role === ChatRole.USER
        ? {
            role: 'user',
            content: message.content,
          }
        : {
            role: 'assistant',
            content: message.content,
        },
    ),
  ];

  let completion;

  try {
    completion = await client.chat.completions.create({
      model: env.GROQ_MODEL,
      temperature: 0.2,
      max_completion_tokens: 350,
      messages,
    });
  } catch (error) {
    if (isPromptBudgetError(error)) {
      return {
        reply: buildFallbackReply(project),
        sourceRefs: {
          runbookIds: rankedRunbooks.map((runbook) => runbook.id),
          projectDocIds: rankedDocs.map((doc) => doc.id),
        } satisfies JuliaSourceRefs,
      };
    }

    throw error;
  }

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new AppError(502, 'Julia AI did not return a response.');
  }

  return {
    reply: content,
    sourceRefs: {
      runbookIds: rankedRunbooks.map((runbook) => runbook.id),
      projectDocIds: rankedDocs.map((doc) => doc.id),
    } satisfies JuliaSourceRefs,
  };
};

type SupportConversationMessage = {
  role: 'USER' | 'JULIA' | 'SYSTEM';
  content: string;
};

export const generateSupportSessionReply = async (supportSessionId: number, conversation: SupportConversationMessage[]) => {
  const supportSession = await prisma.supportSession.findUnique({
    where: {
      id: supportSessionId,
    },
    include: {
      client: true,
      hardwareAsset: true,
      selectedTopic: true,
      project: {
        include: {
          docs: {
            where: {
              status: 'PUBLISHED',
            },
            orderBy: {
              updatedAt: 'desc',
            },
          },
        },
      },
    },
  });

  if (!supportSession) {
    throw notFound('Support session not found.');
  }

  const normalizedConversation = normalizeConversation(
    conversation
      .filter((message) => message.role !== 'SYSTEM')
      .map((message) => ({
        role: message.role === 'JULIA' ? ChatRole.JULIA : ChatRole.USER,
        content: message.content,
      })),
  );
  const latestUserMessage = [...normalizedConversation].reverse().find((message) => message.role === ChatRole.USER)?.content || '';

  const supportTopicScopes = [
    { scope: 'GLOBAL' as const },
    ...(supportSession.clientId ? [{ clientId: supportSession.clientId }] : []),
    ...(supportSession.projectId ? [{ projectId: supportSession.projectId }] : []),
    ...(supportSession.hardwareAssetId ? [{ hardwareAssetId: supportSession.hardwareAssetId }] : []),
    ...(supportSession.hardwareAsset?.category ? [{ hardwareCategory: supportSession.hardwareAsset.category }] : []),
  ];

  const [supportTopics, runbooks] = await Promise.all([
    prisma.supportTopic.findMany({
      where: {
        status: 'PUBLISHED',
        supportType: {
          in: ['GENERAL', supportSession.supportType],
        },
        OR: supportTopicScopes,
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 12,
    }),
    prisma.runbook.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 6,
    }),
  ]);

  const rankedTopics = supportTopics
    .map((topic) => ({ ...topic, score: scoreKnowledgeItem(latestUserMessage, topic) }))
    .sort((left, right) => right.score - left.score || left.sortOrder - right.sortOrder || right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, MAX_CONTEXT_ITEMS + 1);
  const rankedDocs = (supportSession.project?.docs || [])
    .map((doc) => ({ ...doc, score: scoreKnowledgeItem(latestUserMessage, doc) }))
    .sort((left, right) => right.score - left.score || right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, MAX_CONTEXT_ITEMS);
  const rankedRunbooks = runbooks
    .map((runbook) => ({ ...runbook, score: scoreKnowledgeItem(latestUserMessage, runbook) }))
    .sort((left, right) => right.score - left.score || right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, MAX_CONTEXT_ITEMS);

  const fallbackReply =
    supportSession.project?.juliaFallbackMessage ||
    'I do not have enough approved support context to answer confidently. I can escalate this to the ATC support team with the details collected so far.';

  if (!env.GROQ_API_KEY) {
    return {
      reply: fallbackReply,
      sourceRefs: {
        runbookIds: rankedRunbooks.map((runbook) => runbook.id),
        projectDocIds: rankedDocs.map((doc) => doc.id),
        supportTopicIds: rankedTopics.map((topic) => topic.id),
      } satisfies JuliaSourceRefs,
    };
  }

  const contextHeader = [
    `Support type: ${supportSession.supportType}`,
    supportSession.client ? `Client: ${supportSession.client.name}` : null,
    supportSession.project ? `Project: ${supportSession.project.name}` : null,
    supportSession.hardwareAsset
      ? `Hardware: ${[
          supportSession.hardwareAsset.category,
          supportSession.hardwareAsset.brand,
          supportSession.hardwareAsset.model,
          supportSession.hardwareAsset.serialNumber ? `Serial ${supportSession.hardwareAsset.serialNumber}` : null,
        ]
          .filter(Boolean)
          .join(' | ')}`
      : null,
    supportSession.selectedTopic ? `Selected topic: ${supportSession.selectedTopic.title}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = [
    'You are Julia, ATC Support\'s frontline assistant.',
    'Use structured support topics, SOPs, playbooks, and project context before giving advice.',
    'Ask one practical diagnostic question at a time when troubleshooting.',
    'Do not guess. If the case is risky, hardware-damage related, or unsupported by context, recommend escalation.',
    'Keep the response concise and suitable for a support widget.',
    contextHeader,
    buildContextSection(
      'Support Topics',
      rankedTopics.map((topic) => ({
        title: topic.title,
        content: topic.content,
      })),
    ),
    buildContextSection(
      'Project Documents',
      rankedDocs.map((doc) => ({
        title: doc.title,
        content: doc.content,
      })),
    ),
    buildContextSection(
      'Runbooks',
      rankedRunbooks.map((runbook) => ({
        title: runbook.title,
        content: runbook.content,
      })),
    ),
  ].join('\n\n');

  const client = new Groq({
    apiKey: env.GROQ_API_KEY,
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...normalizedConversation.map<ChatCompletionMessageParam>((message) =>
      message.role === ChatRole.USER
        ? {
            role: 'user',
            content: message.content,
          }
        : {
            role: 'assistant',
            content: message.content,
          },
    ),
  ];

  let completion;

  try {
    completion = await client.chat.completions.create({
      model: env.GROQ_MODEL,
      temperature: 0.2,
      max_completion_tokens: 350,
      messages,
    });
  } catch (error) {
    if (isPromptBudgetError(error)) {
      return {
        reply: fallbackReply,
        sourceRefs: {
          runbookIds: rankedRunbooks.map((runbook) => runbook.id),
          projectDocIds: rankedDocs.map((doc) => doc.id),
          supportTopicIds: rankedTopics.map((topic) => topic.id),
        } satisfies JuliaSourceRefs,
      };
    }

    throw error;
  }

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new AppError(502, 'Julia AI did not return a response.');
  }

  return {
    reply: content,
    sourceRefs: {
      runbookIds: rankedRunbooks.map((runbook) => runbook.id),
      projectDocIds: rankedDocs.map((doc) => doc.id),
      supportTopicIds: rankedTopics.map((topic) => topic.id),
    } satisfies JuliaSourceRefs,
  };
};
