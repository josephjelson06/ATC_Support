import { withDisplayId } from './idPrefix';

type AnyRecord = {
  id: number;
  [key: string]: unknown;
};

const withoutPasswordHash = (record: AnyRecord) => {
  const { passwordHash, ...safeRecord } = record;
  return safeRecord;
};

export const serializeUser = <T extends AnyRecord | null | undefined>(user: T) => {
  if (!user) {
    return null;
  }

  return withDisplayId(withoutPasswordHash(user), 'USR');
};

export const serializeClient = <T extends AnyRecord | null | undefined>(client: T) => {
  if (!client) {
    return null;
  }

  return withDisplayId(client, 'CLT');
};

export const serializeProject = <T extends AnyRecord | null | undefined>(project: T) => {
  if (!project) {
    return null;
  }

  const nextProject: Record<string, unknown> = {
    ...withDisplayId(project, 'PRJ'),
  };

  if (typeof project.widgetKey === 'string') {
    nextProject.embedCode = `<script src="\${WIDGET_HOST}/widget.js" data-widget-key="${project.widgetKey}"></script>`;
  }

  if ('client' in project) {
    nextProject.client = serializeClient(project.client as AnyRecord | null | undefined);
  }

  if ('assignedTo' in project) {
    nextProject.assignedTo = serializeUser(project.assignedTo as AnyRecord | null | undefined);
  }

  return nextProject;
};

export const serializeAmc = <T extends AnyRecord | null | undefined>(amc: T) => {
  if (!amc) {
    return null;
  }

  const nextAmc: Record<string, unknown> = {
    ...withDisplayId(amc, 'AMC'),
  };

  if ('project' in amc) {
    nextAmc.project = serializeProject(amc.project as AnyRecord | null | undefined);
  }

  return nextAmc;
};

export const serializeRunbook = <T extends AnyRecord | null | undefined>(runbook: T) => {
  if (!runbook) {
    return null;
  }

  const nextRunbook: Record<string, unknown> = {
    ...withDisplayId(runbook, 'RB'),
  };

  if ('createdBy' in runbook) {
    nextRunbook.createdBy = serializeUser(runbook.createdBy as AnyRecord | null | undefined);
  }

  return nextRunbook;
};

export const serializeTicket = <T extends AnyRecord | null | undefined>(ticket: T) => {
  if (!ticket) {
    return null;
  }

  const nextTicket: Record<string, unknown> = {
    ...withDisplayId(ticket, 'TKT'),
  };

  if ('project' in ticket) {
    nextTicket.project = serializeProject(ticket.project as AnyRecord | null | undefined);
  }

  if ('assignedTo' in ticket) {
    nextTicket.assignedTo = serializeUser(ticket.assignedTo as AnyRecord | null | undefined);
  }

  return nextTicket;
};

export const serializeTicketAttachment = <T extends AnyRecord | null | undefined>(attachment: T) => {
  if (!attachment) {
    return null;
  }

  const nextAttachment: Record<string, unknown> = { ...attachment };

  if ('uploadedBy' in attachment) {
    nextAttachment.uploadedBy = serializeUser(attachment.uploadedBy as AnyRecord | null | undefined);
  }

  return nextAttachment;
};

export const serializeEscalationHistory = <T extends AnyRecord | null | undefined>(event: T) => {
  if (!event) {
    return null;
  }

  const nextEvent: Record<string, unknown> = { ...event };

  if ('createdBy' in event) {
    nextEvent.createdBy = serializeUser(event.createdBy as AnyRecord | null | undefined);
  }

  return nextEvent;
};

export const serializeTicketMessage = <T extends AnyRecord | null | undefined>(message: T) => {
  if (!message) {
    return null;
  }

  const nextMessage: Record<string, unknown> = { ...message };

  if ('user' in message) {
    nextMessage.user = serializeUser(message.user as AnyRecord | null | undefined);
  }

  if ('attachments' in message && Array.isArray(message.attachments)) {
    nextMessage.attachments = message.attachments.map((attachment) => serializeTicketAttachment(attachment as AnyRecord | null | undefined));
  }

  return nextMessage;
};

export const serializeChatSession = <T extends AnyRecord | null | undefined>(chatSession: T) => {
  if (!chatSession) {
    return null;
  }

  const nextChatSession: Record<string, unknown> = { ...chatSession };

  if ('project' in chatSession) {
    nextChatSession.project = serializeProject(chatSession.project as AnyRecord | null | undefined);
  }

  if ('ticket' in chatSession) {
    nextChatSession.ticket = serializeTicket(chatSession.ticket as AnyRecord | null | undefined);
  }

  return nextChatSession;
};
