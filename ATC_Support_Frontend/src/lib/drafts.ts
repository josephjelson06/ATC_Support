import { storageKeys } from './config';
import { humanizeEnum } from './format';
import type { ApiChatMessage, ApiRunbook, ApiTicket, ApiTicketMessage } from './types';

export interface DraftSuggestion {
  ticketId: number;
  ticketDisplayId: string;
  title: string;
  category: string;
  confidence: number;
  createdAt: string;
  summary: string;
  content: string;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const keywordCategories: Array<{ category: string; keywords: string[] }> = [
  { category: 'Authentication', keywords: ['login', 'password', 'auth', 'access', 'permission'] },
  { category: 'Billing', keywords: ['invoice', 'billing', 'payment', 'tax', 'reconciliation'] },
  { category: 'Infrastructure', keywords: ['database', 'server', 'worker', 'queue', 'deployment', 'cache', 'network'] },
  { category: 'Frontend', keywords: ['ui', 'screen', 'dashboard', 'browser', 'page', 'render'] },
  { category: 'Operations', keywords: ['export', 'job', 'sync', 'batch', 'report', 'processing'] },
];

const toSentence = (value: string) => {
  const nextValue = value.trim();

  if (!nextValue) {
    return '';
  }

  return /[.!?]$/.test(nextValue) ? nextValue : `${nextValue}.`;
};

const uniqueLines = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalize(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

const inferCategory = (ticket: ApiTicket) => {
  const haystack = `${ticket.title} ${ticket.description || ''} ${ticket.project?.name || ''}`.toLowerCase();

  for (const rule of keywordCategories) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return 'Operations';
};

const extractResolutionLines = (ticket: ApiTicket) => {
  const ticketMessages = (ticket.messages || [])
    .map((message: ApiTicketMessage) => message.content)
    .filter(Boolean)
    .map((message) => normalize(message))
    .filter((message) => !message.startsWith('ticket created from widget escalation'));

  const chatMessages = (ticket.chatSession?.messages || [])
    .filter((message: ApiChatMessage) => message.role === 'USER')
    .map((message) => message.content)
    .filter(Boolean)
    .map((message) => normalize(message));

  const lines = uniqueLines([...ticketMessages, ...chatMessages]).slice(0, 4);

  if (lines.length > 0) {
    return lines.map((line) => toSentence(line.charAt(0).toUpperCase() + line.slice(1)));
  }

  if (ticket.description) {
    return [
      toSentence(`Review the reported issue: ${ticket.description}`),
      'Validate the affected workflow in the project environment.',
      'Apply the fix and confirm the user can complete the original task.',
    ];
  }

  return [
    'Review the reported issue and reproduce it in the relevant project workflow.',
    'Apply the corrective change or operational fix that resolves the failure.',
    'Confirm the workflow is stable before closing the ticket.',
  ];
};

const buildSymptoms = (ticket: ApiTicket) => {
  const chatSymptoms = (ticket.chatSession?.messages || [])
    .filter((message: ApiChatMessage) => message.role === 'USER')
    .map((message) => toSentence(message.content))
    .slice(0, 2);

  return uniqueLines([
    toSentence(ticket.title),
    ticket.description ? toSentence(ticket.description) : '',
    ...chatSymptoms,
  ]).slice(0, 3);
};

export const createDraftSuggestion = (ticket: ApiTicket): DraftSuggestion => {
  const category = inferCategory(ticket);
  const resolutionLines = extractResolutionLines(ticket);
  const symptoms = buildSymptoms(ticket);
  const projectLabel = ticket.project?.name || 'project workflow';
  const clientLabel = ticket.project?.client?.name || 'the client environment';
  const confidence = Math.min(
    98,
    72 +
      (ticket.description ? 6 : 0) +
      Math.min(12, (ticket.messages?.length || 0) * 4) +
      Math.min(8, (ticket.chatSession?.messages?.length || 0) * 2) +
      (ticket.assignedTo ? 4 : 0) +
      (ticket.resolvedAt ? 4 : 0),
  );

  const content = [
    '## Overview',
    toSentence(ticket.description || `Resolution guide for "${ticket.title}" in ${projectLabel}`),
    '',
    '## Source Ticket',
    `- Ticket: ${ticket.displayId}`,
    ticket.project ? `- Project: ${ticket.project.name}` : '',
    ticket.project?.client ? `- Client: ${ticket.project.client.name}` : '',
    ticket.assignedTo ? `- Resolved By: ${ticket.assignedTo.name}` : '',
    ticket.priority ? `- Priority: ${humanizeEnum(ticket.priority)}` : '',
    '',
    '## Symptoms',
    ...symptoms.map((symptom) => `- ${symptom}`),
    '',
    '## Resolution Steps',
    ...resolutionLines.map((line, index) => `${index + 1}. ${line}`),
    '',
    '## Verification',
    `- Confirm the original issue no longer reproduces in ${projectLabel}.`,
    `- Ask the user to retry the affected workflow in ${clientLabel}.`,
    '- Record any environment-specific notes before closing the ticket.',
    '',
    '## Notes',
    '- Generated from resolved ticket activity in the ATC Support workflow.',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    ticketId: ticket.id,
    ticketDisplayId: ticket.displayId,
    title: ticket.title,
    category,
    confidence,
    createdAt: ticket.resolvedAt || ticket.createdAt,
    summary: toSentence(ticket.description || ticket.title),
    content,
  };
};

export const getDismissedDraftIds = () => {
  if (typeof window === 'undefined') {
    return [] as number[];
  }

  try {
    const value = window.localStorage.getItem(storageKeys.dismissedDrafts);

    if (!value) {
      return [] as number[];
    }

    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === 'number') : [];
  } catch {
    return [] as number[];
  }
};

export const dismissDraftIds = (ids: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextIds = Array.from(new Set([...getDismissedDraftIds(), ...ids])).sort((left, right) => left - right);
  window.localStorage.setItem(storageKeys.dismissedDrafts, JSON.stringify(nextIds));
};

export const restoreDraftId = (id: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextIds = getDismissedDraftIds().filter((existingId) => existingId !== id);
  window.localStorage.setItem(storageKeys.dismissedDrafts, JSON.stringify(nextIds));
};

export const buildDraftQueue = (tickets: ApiTicket[], runbooks: ApiRunbook[]) => {
  const dismissedIds = new Set(getDismissedDraftIds());
  const existingTitles = new Set(runbooks.map((runbook) => normalize(runbook.title)));

  return tickets
    .filter((ticket) => ticket.status === 'RESOLVED')
    .map((ticket) => createDraftSuggestion(ticket))
    .filter((draft) => !dismissedIds.has(draft.ticketId))
    .filter((draft) => !existingTitles.has(normalize(draft.title)))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};
