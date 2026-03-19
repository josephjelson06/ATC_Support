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
};

const MAX_CONTEXT_CHARS = 14_000;
const MAX_CONTEXT_ITEMS = 4;

const truncateContext = (value: string) => (value.length > MAX_CONTEXT_CHARS ? `${value.slice(0, MAX_CONTEXT_CHARS)}...` : value);

const buildContextSection = (label: string, items: Array<{ title: string; content: string }>) => {
  if (!items.length) {
    return `${label}:\n- None available`;
  }

  return `${label}:\n${items
    .map((item, index) => `- ${index + 1}. ${item.title}\n${truncateContext(item.content)}`)
    .join('\n\n')}`;
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
    take: 10,
  });

  const latestUserMessage = [...conversation].reverse().find((message) => message.role === ChatRole.USER)?.content || '';
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
    ...conversation.map<ChatCompletionMessageParam>((message) =>
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

  const completion = await client.chat.completions.create({
    model: env.GROQ_MODEL,
    temperature: 0.2,
    max_completion_tokens: 500,
    messages,
  });

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
