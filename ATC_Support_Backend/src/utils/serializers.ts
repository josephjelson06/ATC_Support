import { withDisplayId } from './idPrefix';
import { buildUserPermissions } from './userModel';

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

  const safeUser = withDisplayId(withoutPasswordHash(user), 'USR') as Record<string, unknown>;

  if (
    typeof safeUser.role === 'string' &&
    typeof safeUser.scopeMode === 'string' &&
    typeof safeUser.assignmentAuthority === 'string'
  ) {
    safeUser.permissions = buildUserPermissions({
      role: safeUser.role as never,
      supportLevel: (safeUser.supportLevel as never) ?? null,
      scopeMode: safeUser.scopeMode as never,
      assignmentAuthority: safeUser.assignmentAuthority as never,
    });
  }

  if ('projectMemberships' in safeUser && Array.isArray(safeUser.projectMemberships)) {
    safeUser.projectMemberships = safeUser.projectMemberships.map((membership) => {
      const projectMembership = membership as Record<string, unknown>;

      return {
        projectId: projectMembership.projectId,
        createdAt: projectMembership.createdAt,
        project:
          'project' in projectMembership && projectMembership.project
            ? serializeProject(projectMembership.project as AnyRecord | null | undefined)
            : null,
      };
    });
  }

  return safeUser;
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

  if ('memberships' in project && Array.isArray(project.memberships)) {
    nextProject.memberships = project.memberships.map((membership) => {
      const projectMembership = membership as Record<string, unknown>;

      return {
        userId: projectMembership.userId,
        createdAt: projectMembership.createdAt,
        user:
          'user' in projectMembership && projectMembership.user
            ? serializeUser(projectMembership.user as AnyRecord | null | undefined)
            : null,
      };
    });
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

export const serializeHardwareAsset = <T extends AnyRecord | null | undefined>(hardwareAsset: T) => {
  if (!hardwareAsset) {
    return null;
  }

  const nextHardwareAsset: Record<string, unknown> = {
    ...withDisplayId(hardwareAsset, 'HW'),
  };

  if ('client' in hardwareAsset) {
    nextHardwareAsset.client = serializeClient(hardwareAsset.client as AnyRecord | null | undefined);
  }

  if ('project' in hardwareAsset) {
    nextHardwareAsset.project = serializeProject(hardwareAsset.project as AnyRecord | null | undefined);
  }

  if ('amc' in hardwareAsset) {
    nextHardwareAsset.amc = serializeAmc(hardwareAsset.amc as AnyRecord | null | undefined);
  }

  return nextHardwareAsset;
};

export const serializeSupportTopic = <T extends AnyRecord | null | undefined>(supportTopic: T) => {
  if (!supportTopic) {
    return null;
  }

  const nextSupportTopic: Record<string, unknown> = {
    ...withDisplayId(supportTopic, 'TOP'),
  };

  if ('client' in supportTopic) {
    nextSupportTopic.client = serializeClient(supportTopic.client as AnyRecord | null | undefined);
  }

  if ('project' in supportTopic) {
    nextSupportTopic.project = serializeProject(supportTopic.project as AnyRecord | null | undefined);
  }

  if ('hardwareAsset' in supportTopic) {
    nextSupportTopic.hardwareAsset = serializeHardwareAsset(supportTopic.hardwareAsset as AnyRecord | null | undefined);
  }

  return nextSupportTopic;
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

  if ('client' in ticket) {
    nextTicket.client = serializeClient(ticket.client as AnyRecord | null | undefined);
  }

  if ('hardwareAsset' in ticket) {
    nextTicket.hardwareAsset = serializeHardwareAsset(ticket.hardwareAsset as AnyRecord | null | undefined);
  }

  if ('supportSession' in ticket) {
    const supportSession = ticket.supportSession as AnyRecord | null | undefined;
    nextTicket.supportSession = supportSession
      ? {
          ...withDisplayId(supportSession, 'SSN'),
          ticket: undefined,
        }
      : null;
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

export const serializeNotification = <T extends AnyRecord | null | undefined>(notification: T) => {
  if (!notification) {
    return null;
  }

  return withDisplayId(notification, 'NTF');
};

export const serializeTicketEmail = <T extends AnyRecord | null | undefined>(email: T) => {
  if (!email) {
    return null;
  }

  const nextEmail: Record<string, unknown> = { ...email };

  if ('createdBy' in email) {
    nextEmail.createdBy = serializeUser(email.createdBy as AnyRecord | null | undefined);
  }

  return nextEmail;
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

export const serializeSupportSessionMessage = <T extends AnyRecord | null | undefined>(message: T) => {
  if (!message) {
    return null;
  }

  return { ...message };
};

export const serializeSupportSession = <T extends AnyRecord | null | undefined>(supportSession: T) => {
  if (!supportSession) {
    return null;
  }

  const nextSupportSession: Record<string, unknown> = {
    ...withDisplayId(supportSession, 'SSN'),
  };

  if ('client' in supportSession) {
    nextSupportSession.client = serializeClient(supportSession.client as AnyRecord | null | undefined);
  }

  if ('project' in supportSession) {
    nextSupportSession.project = serializeProject(supportSession.project as AnyRecord | null | undefined);
  }

  if ('hardwareAsset' in supportSession) {
    nextSupportSession.hardwareAsset = serializeHardwareAsset(supportSession.hardwareAsset as AnyRecord | null | undefined);
  }

  if ('selectedTopic' in supportSession) {
    nextSupportSession.selectedTopic = serializeSupportTopic(supportSession.selectedTopic as AnyRecord | null | undefined);
  }

  if ('messages' in supportSession && Array.isArray(supportSession.messages)) {
    nextSupportSession.messages = supportSession.messages.map((message) =>
      serializeSupportSessionMessage(message as AnyRecord | null | undefined),
    );
  }

  if ('ticket' in supportSession) {
    nextSupportSession.ticket = serializeTicket(supportSession.ticket as AnyRecord | null | undefined);
  }

  return nextSupportSession;
};
