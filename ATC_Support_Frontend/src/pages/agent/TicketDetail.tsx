import { type ChangeEvent, type ReactNode, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Lock,
  Mail,
  MessageSquare,
  Paperclip,
  PlayCircle,
  RotateCcw,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

import EmptyState from '../../components/layout/EmptyState';
import PageHeader from '../../components/layout/PageHeader';
import SectionTabs from '../../components/layout/SectionTabs';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiDownloadFile, apiFetch, getErrorMessage } from '../../lib/api';
import { formatBytes, formatDateTime, formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type {
  ApiEscalationHistory,
  ApiTicket,
  ApiTicketAttachment,
  ApiTicketEmail,
  ApiTicketMessage,
  TicketDetailTab,
  TicketMessageType,
} from '../../lib/types';

const detailTabs: TicketDetailTab[] = ['summary', 'conversation', 'attachments', 'email', 'history'];

const tabLabels: Record<TicketDetailTab, string> = {
  summary: 'Summary',
  conversation: 'Conversation',
  attachments: 'Attachments',
  email: 'Email History',
  history: 'History',
};

type ActivityEntry =
  | { id: string; createdAt: string; kind: 'message'; message: ApiTicketMessage }
  | { id: string; createdAt: string; kind: 'escalation'; escalation: ApiEscalationHistory };

export default function TicketDetail() {
  const navigate = useNavigate();
  const { id, tab } = useParams();
  const ticketId = Number(id);
  const currentTab = detailTabs.includes((tab as TicketDetailTab) || 'summary') ? ((tab as TicketDetailTab) || 'summary') : 'summary';
  const { role, user, backendRole } = useRole();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const [interactionType, setInteractionType] = useState<'reply' | 'note'>('reply');
  const [messageText, setMessageText] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const ticketQuery = useAsyncData(() => apiFetch<ApiTicket>(`/tickets/${ticketId}`), [ticketId]);

  const isReadOnly = role === 'Project Manager';

  const ticketMessages = useMemo(() => (ticketQuery.data?.messages || []).slice(), [ticketQuery.data?.messages]);
  const transcriptMessages = useMemo(
    () => (ticketQuery.data?.chatSession?.messages || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [ticketQuery.data?.chatSession?.messages],
  );
  const ticketAttachments = useMemo(
    () =>
      ticketMessages
        .flatMap((entry) => entry.attachments || [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [ticketMessages],
  );
  const emailEvents = useMemo(
    () => (ticketQuery.data?.emailEvents || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [ticketQuery.data?.emailEvents],
  );
  const activityEntries = useMemo<ActivityEntry[]>(() => {
    const messageEntries = ticketMessages.map(
      (message): ActivityEntry => ({ id: `message-${message.id}`, createdAt: message.createdAt, kind: 'message', message }),
    );
    const escalationEntries = (ticketQuery.data?.escalationHistory || []).map(
      (escalation): ActivityEntry => ({ id: `escalation-${escalation.id}`, createdAt: escalation.createdAt, kind: 'escalation', escalation }),
    );

    return [...messageEntries, ...escalationEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ticketMessages, ticketQuery.data?.escalationHistory]);

  const resetComposer = () => {
    setMessageText('');
    setAttachmentFiles([]);
    setFileInputKey((current) => current + 1);
  };

  const performTicketAction = async (path: string, body: Record<string, unknown> | undefined, successMessage: string) => {
    try {
      await apiFetch<ApiTicket>(path, { method: 'POST', body });
      await ticketQuery.reload();
      showToast('success', successMessage);
    } catch (error) {
      showToast('error', getErrorMessage(error));
      throw error;
    }
  };

  const handleAssignToMe = async () => {
    if (!user || isReadOnly) return;
    await performTicketAction(`/tickets/${ticketId}/assign`, { assignedToId: user.id }, 'Ticket assigned successfully.');
  };

  const handleStartWork = async () => {
    if (isReadOnly) return;
    await performTicketAction(`/tickets/${ticketId}/start`, undefined, 'Work started on this ticket.');
  };

  const handleWaitingOnCustomer = async () => {
    const note = window.prompt('Optional note about what we need from the customer:', '') || undefined;
    await performTicketAction(
      `/tickets/${ticketId}/waiting-on-customer`,
      note?.trim() ? { note: note.trim() } : undefined,
      'Ticket moved to waiting on customer.',
    );
  };

  const handleResolve = async () => {
    const resolutionSummary = window.prompt('Add a short resolution summary for this ticket:');
    if (!resolutionSummary?.trim()) return;
    await performTicketAction(`/tickets/${ticketId}/resolve`, { resolutionSummary: resolutionSummary.trim() }, 'Ticket marked as resolved.');
  };

  const handleReopen = async () => {
    const note = window.prompt('Optional reopen reason:', '') || undefined;
    await performTicketAction(`/tickets/${ticketId}/reopen`, note?.trim() ? { note: note.trim() } : undefined, 'Ticket reopened.');
  };

  const handleEscalate = async () => {
    const note = window.prompt('Optional escalation note for the project lead:', '') || undefined;
    await performTicketAction(`/tickets/${ticketId}/escalate`, note?.trim() ? { note: note.trim() } : undefined, 'Ticket escalated to the project lead.');
  };

  const jumpToComposer = (nextType: 'reply' | 'note') => {
    setInteractionType(nextType);
    if (currentTab !== 'summary') {
      navigate(appPaths.tickets.detail(ticketId, 'summary'));
    }
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openStatusModal = () => {
    openModal({
      title: 'Change Ticket Status',
      size: 'sm',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Choose the next action for this ticket.</p>
          <div className="space-y-2">
            {!isReadOnly && user ? (
              <button
                onClick={() => void handleAssignToMe().then(closeModal)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                Assign to Me
              </button>
            ) : null}
            {!isReadOnly ? (
              <button
                onClick={() => void handleStartWork().then(closeModal)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <PlayCircle className="h-4 w-4" />
                Start Work
              </button>
            ) : null}
            {!isReadOnly && canMoveToWaiting ? (
              <button
                onClick={() => void handleWaitingOnCustomer().then(closeModal)}
                className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                <Users className="h-4 w-4" />
                Waiting on Customer
              </button>
            ) : null}
            {!isReadOnly ? (
              <button
                onClick={() => void handleResolve().then(closeModal)}
                className="flex w-full items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Resolved
              </button>
            ) : null}
            {!isReadOnly && canReopen ? (
              <button
                onClick={() => void handleReopen().then(closeModal)}
                className="flex w-full items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
              >
                <RotateCcw className="h-4 w-4" />
                Reopen Ticket
              </button>
            ) : null}
            {!isReadOnly && role === 'Support Engineer' ? (
              <button
                onClick={() => void handleEscalate().then(closeModal)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <AlertCircle className="h-4 w-4" />
                Escalate to Project Lead
              </button>
            ) : null}
            {isReadOnly ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Status updates are disabled for this role.
              </div>
            ) : null}
          </div>
        </div>
      ),
    });
  };

  const handleAttachmentSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length === 0) return;
    setAttachmentFiles((current) => [...current, ...nextFiles].slice(0, 5));
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachmentFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleDownloadAttachment = async (attachmentId: number, originalName: string) => {
    try {
      await apiDownloadFile(`/ticket-attachments/${attachmentId}/download`, originalName);
    } catch (error) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleSendInteraction = async () => {
    if (!messageText.trim() && attachmentFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('content', messageText.trim());
      formData.append('type', (interactionType === 'reply' ? 'REPLY' : 'INTERNAL_NOTE') as TicketMessageType);
      attachmentFiles.forEach((file) => formData.append('attachments', file));

      await apiFetch(`/tickets/${ticketId}/messages`, { method: 'POST', body: formData });
      resetComposer();
      await ticketQuery.reload();
      showToast('success', interactionType === 'reply' ? 'Reply sent.' : 'Internal note added.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!Number.isInteger(ticketId)) {
    return <TicketError message="Invalid ticket id." onRetry={() => window.history.back()} retryLabel="Go Back" />;
  }

  if (ticketQuery.isLoading) {
    return <TicketSkeleton />;
  }

  if (ticketQuery.error || !ticketQuery.data) {
    return <TicketError message={ticketQuery.error || 'Ticket not found.'} onRetry={ticketQuery.reload} />;
  }

  const ticket = ticketQuery.data;
  const canMoveToWaiting = !isReadOnly && ticket.status !== 'RESOLVED' && ticket.status !== 'WAITING_ON_CUSTOMER';
  const canReopen = !isReadOnly && ticket.status === 'RESOLVED';
  const requesterName = ticket.requesterName || ticket.chatSession?.clientName || 'Unknown requester';
  const requesterEmail = ticket.requesterEmail || ticket.chatSession?.clientEmail || null;
  const ticketTabs = detailTabs.map((detailTab) => ({ label: tabLabels[detailTab], to: appPaths.tickets.detail(ticketId, detailTab) }));

  let mainContent: ReactNode = null;

  switch (currentTab) {
    case 'summary':
      mainContent = (
        <>
          <DetailCard eyebrow="Ticket Overview" title="Issue Summary" description="Summary holds the working details of the ticket.">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{ticket.description || 'No description provided.'}</p>
            {ticket.resolutionSummary ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-green-700">Resolution Summary</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-green-900">{ticket.resolutionSummary}</p>
              </div>
            ) : null}
          </DetailCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DetailCard eyebrow="Ticket Details" title="Lifecycle Details" description="Core routing and lifecycle metadata.">
              <DetailGrid
                items={[
                  { label: 'Ticket', value: ticket.displayId },
                  { label: 'Source', value: ticket.source ? humanizeEnum(ticket.source) : 'Widget' },
                  {
                    label: 'Status',
                    value: (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>
                        {humanizeEnum(ticket.status)}
                      </span>
                    ),
                  },
                  {
                    label: 'Priority',
                    value: (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>
                        {humanizeEnum(ticket.priority)}
                      </span>
                    ),
                  },
                  { label: 'Assigned To', value: ticket.assignedTo?.name || 'Unassigned' },
                  { label: 'Created', value: formatDateTime(ticket.createdAt) },
                  { label: 'Resolved', value: ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : 'Not resolved' },
                  { label: 'Escalations', value: String((ticket.escalationHistory || []).length) },
                ]}
              />
            </DetailCard>

            <DetailCard eyebrow="Support Context" title="Requester and Routing" description="Who raised the issue and how the thread comes back into support.">
              <DetailGrid
                items={[
                  { label: 'Requester', value: requesterName },
                  { label: 'Requester Email', value: requesterEmail || 'Not available' },
                  { label: 'Client', value: ticket.project?.client?.name || 'Not linked' },
                  { label: 'Project', value: ticket.project?.name || 'Not linked' },
                  { label: 'Widget Chat Messages', value: String(transcriptMessages.length) },
                  { label: 'Email Thread Token', value: ticket.emailThreadToken ? <span className="break-all font-mono text-xs">{ticket.emailThreadToken}</span> : 'Not created yet' },
                ]}
              />
            </DetailCard>
          </div>

          {!isReadOnly ? (
            <div ref={composerRef}>
              <DetailCard eyebrow="Respond" title="Reply or Add Internal Note" description="Keep replies and notes inside the working summary tab.">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex border-b border-slate-200 bg-slate-50/60">
                  <button
                    onClick={() => setInteractionType('reply')}
                    className={clsx(
                      'flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-all',
                      interactionType === 'reply' ? 'border-b-2 border-orange-600 bg-white text-orange-600' : 'text-slate-400 hover:text-slate-600',
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Reply to Client
                  </button>
                  <button
                    onClick={() => setInteractionType('note')}
                    className={clsx(
                      'flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-all',
                      interactionType === 'note' ? 'border-b-2 border-amber-600 bg-white text-amber-600' : 'text-slate-400 hover:text-slate-600',
                    )}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Internal Note
                  </button>
                </div>

                <div className="p-5">
                  {interactionType === 'reply' ? (
                    <div className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                      <p className="font-semibold">This reply will be emailed to {requesterEmail || 'the requester on file when available'}.</p>
                      <p className="mt-1 text-xs text-orange-700">Customer replies can thread back into this ticket through the email token.</p>
                    </div>
                  ) : (
                    <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <p className="font-semibold">Internal notes stay inside ATC Support and are never emailed to the client.</p>
                    </div>
                  )}

                  <textarea
                    rows={5}
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder={interactionType === 'reply' ? 'Type your reply to the client...' : 'Type an internal note for the team...'}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-200 focus:bg-white placeholder:text-slate-400"
                  />

                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Attachments</p>
                        <p className="mt-1 text-xs text-slate-500">Up to 5 files, 10 MB each.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-700 transition-colors hover:bg-slate-50">
                        <Paperclip className="h-3.5 w-3.5" />
                        Add Files
                        <input key={fileInputKey} type="file" multiple className="hidden" onChange={handleAttachmentSelection} />
                      </label>
                    </div>

                    {attachmentFiles.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {attachmentFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                            <span className="max-w-[180px] truncate font-semibold">{file.name}</span>
                            <span className="text-slate-400">{formatBytes(file.size)}</span>
                            <button onClick={() => handleRemoveAttachment(index)} className="text-slate-400 transition-colors hover:text-slate-700">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-3">
                  <button
                    onClick={() => void handleSendInteraction()}
                    disabled={(!messageText.trim() && attachmentFiles.length === 0) || isSubmitting}
                    className={clsx(
                      'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50',
                      interactionType === 'reply' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-amber-500 hover:bg-amber-600',
                    )}
                  >
                    <Send className="h-4 w-4" />
                    {interactionType === 'reply' ? 'Send Reply' : 'Add Note'}
                  </button>
                </div>
              </div>
              </DetailCard>
            </div>
          ) : (
            <DetailCard eyebrow="Access" title="Read-Only View" description="Project managers can review details, transcript, history, and email activity here.">
              <p className="text-sm leading-relaxed text-slate-600">Ticket actions, replies, and internal notes are disabled for this role.</p>
            </DetailCard>
          )}
        </>
      );
      break;
    case 'conversation':
      mainContent = (
        <DetailCard
          eyebrow="Conversation"
          title="Julia and Client Chat"
          description="Only the original widget conversation lives here. Replies, notes, and workflow events are kept in History."
          action={<CountBadge count={transcriptMessages.length} label={transcriptMessages.length === 1 ? 'message' : 'messages'} />}
        >
          {transcriptMessages.length === 0 ? (
            <div className="py-6">
              <EmptyState title="No Julia/client transcript available" message="This ticket does not have a stored widget chat transcript." />
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              {transcriptMessages.map((message) => (
                <div key={message.id} className={clsx('flex gap-3', message.role === 'JULIA' && 'flex-row-reverse')}>
                  <div
                    className={clsx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black',
                      message.role === 'JULIA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700',
                    )}
                  >
                    {message.role === 'JULIA' ? 'J' : 'C'}
                  </div>
                  <div className={clsx('max-w-[85%]', message.role === 'JULIA' && 'text-right')}>
                    <div
                      className={clsx(
                        'rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm',
                        message.role === 'JULIA' ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-200 bg-white text-slate-700',
                      )}
                    >
                      {message.content}
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">{formatDateTime(message.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailCard>
      );
      break;
    case 'attachments':
      mainContent = (
        <DetailCard
          eyebrow="Attachments"
          title="Ticket Attachments"
          description="Files uploaded on replies and internal notes live here in one place."
          action={<CountBadge count={ticketAttachments.length} label={ticketAttachments.length === 1 ? 'file' : 'files'} />}
        >
          {ticketAttachments.length === 0 ? (
            <div className="py-6">
              <EmptyState title="No attachments yet" message="Files added to replies and internal notes will appear here." />
            </div>
          ) : (
            <div className="space-y-3">
              {ticketAttachments.map((attachment) => (
                <AttachmentButton key={attachment.id} attachment={attachment} onDownload={() => void handleDownloadAttachment(attachment.id, attachment.originalName)} />
              ))}
            </div>
          )}
        </DetailCard>
      );
      break;
    case 'email':
      mainContent = (
        <DetailCard
          eyebrow="Email History"
          title="Previous Ticket Emails"
          description="Only mail activity is shown here, including outbound updates and inbound customer replies linked to the ticket."
          action={<CountBadge count={emailEvents.length} label={emailEvents.length === 1 ? 'email' : 'emails'} />}
        >
          {ticket.emailThreadToken ? (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Thread Token</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-700">{ticket.emailThreadToken}</p>
            </div>
          ) : null}

          {emailEvents.length === 0 ? (
            <div className="py-6">
              <EmptyState title="No email history yet" message="Outbound updates and inbound customer replies will show here." />
            </div>
          ) : (
            <div className="space-y-4">
              {emailEvents.map((emailEvent) => (
                <EmailHistoryCard key={emailEvent.id} emailEvent={emailEvent} />
              ))}
            </div>
          )}
        </DetailCard>
      );
      break;
    case 'history':
      mainContent = (
        <DetailCard
          eyebrow="History"
          title="Activity Log"
          description="All ticket events except email delivery are collected here: replies, internal notes, system workflow messages, and escalation records."
          action={<CountBadge count={activityEntries.length} label={activityEntries.length === 1 ? 'entry' : 'entries'} />}
        >
          {activityEntries.length === 0 ? (
            <div className="py-6">
              <EmptyState title="No activity recorded yet" message="Ticket activity will appear here as work begins." />
            </div>
          ) : (
            <div className="space-y-4">
              {activityEntries.map((entry) => (
                <ActivityEntryCard key={entry.id} entry={entry} onDownloadAttachment={(attachment) => void handleDownloadAttachment(attachment.id, attachment.originalName)} />
              ))}
            </div>
          )}
        </DetailCard>
      );
      break;
  }

  return (
    <div className="mx-auto max-w-[1520px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title={ticket.title}
        description={ticket.description || 'Ticket detail with clear summary, transcript, email history, and activity log.'}
        breadcrumbs={[
          { label: 'Operations', to: appPaths.tickets.queue },
          { label: 'Tickets', to: appPaths.tickets.queue },
          { label: ticket.displayId },
          { label: tabLabels[currentTab] },
        ]}
        badges={
          <>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">{ticket.displayId}</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>{humanizeEnum(ticket.status)}</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>{humanizeEnum(ticket.priority)}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <Clock3 className="h-3.5 w-3.5" />
              Created {formatRelativeTime(ticket.createdAt)}
            </span>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openStatusModal}
              disabled={isReadOnly}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                isReadOnly ? 'cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-slate-50',
              )}
            >
              <AlertCircle className="h-4 w-4" />
              Change Status
            </button>
            <button
              onClick={() => jumpToComposer('reply')}
              disabled={isReadOnly}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors',
                isReadOnly ? 'cursor-not-allowed bg-orange-300' : 'hover:bg-orange-700',
              )}
            >
              <Mail className="h-4 w-4" />
              Send Email
            </button>
            <button
              onClick={() => jumpToComposer('note')}
              disabled={isReadOnly}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                isReadOnly ? 'cursor-not-allowed text-amber-300' : 'text-amber-800 hover:bg-amber-100',
              )}
            >
              <Lock className="h-4 w-4" />
              Internal Note
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryJumpCard
          label="Conversation"
          value={String(transcriptMessages.length)}
          note={`${transcriptMessages.length} Julia/client message${transcriptMessages.length === 1 ? '' : 's'}`}
          to={appPaths.tickets.detail(ticketId, 'conversation')}
          icon={MessageSquare}
          accent="blue"
        />
        <SummaryJumpCard
          label="Attachments"
          value={String(ticketAttachments.length)}
          note={`${ticketAttachments.length} file${ticketAttachments.length === 1 ? '' : 's'} on this ticket`}
          to={appPaths.tickets.detail(ticketId, 'attachments')}
          icon={Paperclip}
          accent="orange"
        />
        <SummaryJumpCard
          label="Email History"
          value={String(emailEvents.length)}
          note={`${emailEvents.length} email${emailEvents.length === 1 ? '' : 's'} recorded`}
          to={appPaths.tickets.detail(ticketId, 'email')}
          icon={Mail}
          accent="green"
        />
        <SummaryJumpCard
          label="Activity Log"
          value={String(activityEntries.length)}
          note={`${activityEntries.length} history entr${activityEntries.length === 1 ? 'y' : 'ies'}`}
          to={appPaths.tickets.detail(ticketId, 'history')}
          icon={Clock3}
          accent="slate"
        />
      </div>

      <SectionTabs tabs={ticketTabs} role={backendRole} />

      <div className={clsx('grid grid-cols-1 gap-6', currentTab === 'summary' && 'xl:grid-cols-[minmax(0,1fr),340px]')}>
        <div className="min-w-0 space-y-6">{mainContent}</div>

        {currentTab === 'summary' ? (
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            {/* <DetailCard eyebrow="Actions" title="Ticket Actions" description="Move the ticket forward from this summary workspace.">
              {!isReadOnly ? (
                <div className="space-y-3">
                  <button onClick={() => void handleAssignToMe()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200">
                    <UserPlus className="h-4 w-4" />
                    Assign to Me
                  </button>
                  <button onClick={() => void handleStartWork()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                    <PlayCircle className="h-4 w-4" />
                    Start Work
                  </button>
                  {canMoveToWaiting ? (
                    <button onClick={() => void handleWaitingOnCustomer()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100">
                      <Users className="h-4 w-4" />
                      Waiting on Customer
                    </button>
                  ) : null}
                  <button onClick={() => void handleResolve()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Resolved
                  </button>
                  {canReopen ? (
                    <button onClick={() => void handleReopen()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100">
                      <RotateCcw className="h-4 w-4" />
                      Reopen Ticket
                    </button>
                  ) : null}
                  {role === 'Support Engineer' ? (
                    <button onClick={() => void handleEscalate()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                      <AlertCircle className="h-4 w-4" />
                      Escalate to Project Lead
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-slate-600">Project managers can review the ticket here, but ticket state changes and replies are disabled.</p>
              )}
            </DetailCard> */}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function DetailCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p> : null}
          <h2 className="mt-2 text-xl font-black text-slate-900">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
          <div className="mt-2 break-words text-sm font-semibold text-slate-900">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function SummaryJumpCard({
  label,
  value,
  note,
  to,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  to: string;
  icon: typeof MessageSquare;
  accent: 'orange' | 'blue' | 'green' | 'slate';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : accent === 'orange'
          ? 'bg-orange-50 text-orange-600'
          : 'bg-slate-100 text-slate-600';

  return (
    <Link to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{note}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function CountBadge({ count, label }: { count: number; label: string }) {
  return <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{count} {label}</div>;
}

function ActivityEntryCard({
  entry,
  onDownloadAttachment,
}: {
  entry: ActivityEntry;
  onDownloadAttachment: (attachment: ApiTicketAttachment) => void;
}) {
  if (entry.kind === 'escalation') {
    return (
      <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <AlertCircle className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold text-slate-900">{entry.escalation.createdBy?.name || 'System'} escalated the ticket</p>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Escalation</span>
            </div>
          </div>
          <p className="shrink-0 text-xs text-slate-400">{formatDateTime(entry.escalation.createdAt)}</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Status changed from {humanizeEnum(entry.escalation.fromStatus)} to {humanizeEnum(entry.escalation.toStatus)}.
        </p>
        {entry.escalation.note ? <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">{entry.escalation.note}</div> : null}
      </div>
    );
  }

  const messageType = entry.message.type || 'SYSTEM';
  const badgeClass = messageType === 'INTERNAL_NOTE' ? 'bg-amber-100 text-amber-700' : messageType === 'REPLY' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700';
  const iconTone = messageType === 'INTERNAL_NOTE' ? 'bg-amber-100 text-amber-700' : messageType === 'REPLY' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700';
  const Icon = messageType === 'INTERNAL_NOTE' ? Lock : messageType === 'REPLY' ? MessageSquare : AlertCircle;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-2xl ${iconTone}`}>
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-slate-900">{entry.message.user?.name || entry.message.senderName || 'System'}</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${badgeClass}`}>{humanizeEnum(messageType)}</span>
          </div>
          {entry.message.senderEmail && !entry.message.user ? <p className="mt-2 text-xs text-slate-400">{entry.message.senderEmail}</p> : null}
        </div>
        <p className="shrink-0 text-xs text-slate-400">{formatDateTime(entry.message.createdAt)}</p>
      </div>
      {entry.message.content ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{entry.message.content}</p> : null}
      {entry.message.attachments?.length ? (
        <div className="mt-4 space-y-2">
          {entry.message.attachments.map((attachment) => (
            <AttachmentButton key={attachment.id} attachment={attachment} onDownload={() => onDownloadAttachment(attachment)} compact />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmailHistoryCard({ emailEvent }: { emailEvent: ApiTicketEmail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 text-slate-500" />
            <p className="truncate text-sm font-semibold text-slate-900">{emailEvent.subject}</p>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700">{humanizeEnum(emailEvent.direction)}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700">{humanizeEnum(emailEvent.status)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">From {emailEvent.fromEmail}{emailEvent.fromName ? ` (${emailEvent.fromName})` : ''}</p>
          <p className="mt-1 text-xs text-slate-500">To {emailEvent.toEmail}{emailEvent.toName ? ` (${emailEvent.toName})` : ''}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-400">{formatDateTime(emailEvent.createdAt)}</p>
          {emailEvent.deliveredAt ? <p className="mt-1 text-[11px] text-slate-400">Delivered {formatDateTime(emailEvent.deliveredAt)}</p> : null}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{emailEvent.bodyText || 'No email body stored.'}</p>
      </div>
      {emailEvent.errorMessage ? <p className="mt-3 text-xs font-medium text-rose-600">{emailEvent.errorMessage}</p> : null}
    </div>
  );
}

function AttachmentButton({
  attachment,
  onDownload,
  compact = false,
}: {
  attachment: ApiTicketAttachment;
  onDownload: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onDownload}
      className={clsx(
        'flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-colors hover:bg-slate-50',
        compact ? 'px-4 py-3' : 'px-5 py-4',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{attachment.originalName}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatBytes(attachment.sizeBytes)} | {attachment.uploadedBy?.name || 'Unknown uploader'} | {formatDateTime(attachment.createdAt)}
        </p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-slate-500" />
    </button>
  );
}

function TicketSkeleton() {
  return (
    <div className="mx-auto max-w-[1520px] animate-pulse space-y-6 p-6">
      <div className="h-8 w-80 rounded-xl bg-slate-200" />
      <div className="h-12 rounded-2xl bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr),340px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl border border-slate-200 bg-white shadow-sm" />
            ))}
          </div>
          <div className="h-64 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="h-64 rounded-2xl border border-slate-200 bg-white shadow-sm" />
            <div className="h-64 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          </div>
          <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-40 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-40 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function TicketError({ message, onRetry, retryLabel = 'Retry' }: { message: string; onRetry: () => void; retryLabel?: string }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Ticket unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
