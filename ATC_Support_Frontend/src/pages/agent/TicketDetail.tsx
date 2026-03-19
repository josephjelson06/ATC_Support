import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
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

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiDownloadFile, apiFetch, getErrorMessage } from '../../lib/api';
import { formatBytes, formatDateTime, formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiTicket, TicketMessageType } from '../../lib/types';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';

export default function TicketDetail() {
  const { id } = useParams();
  const ticketId = Number(id);
  const { role, user } = useRole();
  const { showToast } = useToast();
  const [interactionType, setInteractionType] = useState<'reply' | 'note'>('reply');
  const [messageText, setMessageText] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ticketQuery = useAsyncData(() => apiFetch<ApiTicket>(`/tickets/${ticketId}`), [ticketId]);

  const isReadOnly = role === 'Project Manager';
  const timeline = useMemo(
    () => (ticketQuery.data?.messages || []).slice().sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    [ticketQuery.data?.messages],
  );
  const ticketAttachments = useMemo(() => timeline.flatMap((entry) => entry.attachments || []), [timeline]);
  const emailEvents = useMemo(
    () => (ticketQuery.data?.emailEvents || []).slice().sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [ticketQuery.data?.emailEvents],
  );

  const resetComposer = () => {
    setMessageText('');
    setAttachmentFiles([]);
    setFileInputKey((current) => current + 1);
  };

  const performTicketAction = async (path: string, body: Record<string, unknown> | undefined, successMessage: string) => {
    try {
      await apiFetch<ApiTicket>(path, {
        method: 'POST',
        body,
      });
      await ticketQuery.reload();
      showToast('success', successMessage);
    } catch (error) {
      showToast('error', getErrorMessage(error));
      throw error;
    }
  };

  const handleAssignToMe = async () => {
    if (!user || isReadOnly) {
      return;
    }

    await performTicketAction(`/tickets/${ticketId}/assign`, { assignedToId: user.id }, 'Ticket assigned successfully.');
  };

  const handleStartWork = async () => {
    if (isReadOnly) {
      return;
    }

    await performTicketAction(`/tickets/${ticketId}/start`, undefined, 'Work started on this ticket.');
  };

  const handleWaitingOnCustomer = async () => {
    const note = window.prompt('Optional note about what we need from the customer:', '') || undefined;

    await performTicketAction(
      `/tickets/${ticketId}/waiting-on-customer`,
      note?.trim()
        ? {
            note: note.trim(),
          }
        : undefined,
      'Ticket moved to waiting on customer.',
    );
  };

  const handleResolve = async () => {
    const resolutionSummary = window.prompt('Add a short resolution summary for this ticket:');

    if (!resolutionSummary?.trim()) {
      return;
    }

    await performTicketAction(
      `/tickets/${ticketId}/resolve`,
      {
        resolutionSummary: resolutionSummary.trim(),
      },
      'Ticket marked as resolved.',
    );
  };

  const handleReopen = async () => {
    const note = window.prompt('Optional reopen reason:', '') || undefined;

    await performTicketAction(
      `/tickets/${ticketId}/reopen`,
      note?.trim()
        ? {
            note: note.trim(),
          }
        : undefined,
      'Ticket reopened.',
    );
  };

  const handleEscalate = async () => {
    const note = window.prompt('Optional escalation note for the project lead:', '') || undefined;

    await performTicketAction(
      `/tickets/${ticketId}/escalate`,
      note?.trim()
        ? {
            note: note.trim(),
          }
        : undefined,
      'Ticket escalated to the project lead.',
    );
  };

  const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);

    if (nextFiles.length === 0) {
      return;
    }

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
    if (!messageText.trim() && attachmentFiles.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('content', messageText.trim());
      formData.append('type', (interactionType === 'reply' ? 'REPLY' : 'INTERNAL_NOTE') as TicketMessageType);
      attachmentFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData,
      });

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/agent/queue" className="group flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-orange-600">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Queue
          </Link>
          <div className="hidden h-6 w-px bg-slate-200 md:block" />
          <h1 className="text-2xl font-bold text-slate-900">{ticket.displayId}</h1>
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>
            {humanizeEnum(ticket.status)}
          </span>
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>
            {humanizeEnum(ticket.priority)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock3 className="h-4 w-4" />
          Created {formatRelativeTime(ticket.createdAt)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">{ticket.title}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {ticket.description || 'No description provided.'}
            </p>
            {ticket.resolutionSummary ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-widest text-green-700">Resolution Summary</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-green-900">{ticket.resolutionSummary}</p>
              </div>
            ) : null}
          </div>

          {ticket.chatSession?.messages?.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h3 className="text-lg font-bold text-slate-900">Original Chat Transcript</h3>
              </div>
              <div className="space-y-4 bg-slate-50/50 p-5">
                {ticket.chatSession.messages.map((message) => (
                  <div key={message.id} className={clsx('flex gap-3', message.role === 'JULIA' && 'flex-row-reverse')}>
                    <div
                      className={clsx(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                        message.role === 'JULIA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700',
                      )}
                    >
                      {message.role === 'JULIA' ? 'J' : 'C'}
                    </div>
                    <div className={clsx('max-w-[80%]', message.role === 'JULIA' && 'items-end')}>
                      <div className={clsx('rounded-xl border p-3 text-sm shadow-sm', message.role === 'JULIA' ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-200 bg-white text-slate-700')}>
                        {message.content}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(message.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Timeline</h3>
              <span className="text-xs text-slate-400">{timeline.length} entries</span>
            </div>

            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                  No internal timeline entries yet.
                </div>
              ) : (
                timeline.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {entry.type === 'INTERNAL_NOTE' ? <Lock className="h-4 w-4 text-amber-600" /> : <MessageSquare className="h-4 w-4 text-orange-600" />}
                        <p className="text-sm font-bold text-slate-900">{entry.user?.name || entry.senderName || 'System'}</p>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            entry.type === 'INTERNAL_NOTE'
                              ? 'bg-amber-100 text-amber-700'
                              : entry.type === 'SYSTEM'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {humanizeEnum(entry.type || 'SYSTEM')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</p>
                    </div>

                    {entry.senderEmail && !entry.user ? <p className="mt-3 text-xs font-medium text-slate-400">{entry.senderEmail}</p> : null}

                    {entry.content ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{entry.content}</p> : null}

                    {entry.attachments?.length ? (
                      <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        {entry.attachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            onClick={() => void handleDownloadAttachment(attachment.id, attachment.originalName)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{attachment.originalName}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatBytes(attachment.sizeBytes)} | {attachment.uploadedBy?.name || 'Unknown uploader'}
                              </p>
                            </div>
                            <Download className="h-4 w-4 shrink-0 text-slate-500" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {ticket.escalationHistory?.length ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Escalation History</h3>
                <span className="text-xs text-slate-400">
                  {ticket.escalationHistory.length} event{ticket.escalationHistory.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-4">
                {ticket.escalationHistory.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-slate-900">{event.createdBy?.name || 'System'} escalated the ticket</p>
                      <p className="text-xs text-slate-400">{formatDateTime(event.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {humanizeEnum(event.fromStatus)} to {humanizeEnum(event.toStatus)}
                    </p>
                    {event.note ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{event.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isReadOnly ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex border-b border-slate-200 bg-slate-50/50">
                <button
                  onClick={() => setInteractionType('reply')}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all',
                    interactionType === 'reply' ? 'border-b-2 border-orange-600 bg-white text-orange-600' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Reply to Client
                </button>
                <button
                  onClick={() => setInteractionType('note')}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all',
                    interactionType === 'note' ? 'border-b-2 border-amber-600 bg-white text-amber-600' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Internal Note
                </button>
              </div>

              <div className="p-4">
                {interactionType === 'reply' ? (
                  <div className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                    <p className="font-semibold">This reply will be emailed to {requesterEmail || 'the requester on file when available'}.</p>
                    <p className="mt-1 text-xs text-orange-700">Replies from the customer can be threaded back into this ticket through the email subject token.</p>
                  </div>
                ) : null}

                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder={interactionType === 'reply' ? 'Type your reply to the client...' : 'Type an internal note...'}
                  className="w-full resize-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />

                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Attachments</p>
                      <p className="mt-1 text-xs text-slate-500">Up to 5 files, 10 MB each.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50">
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
                    'flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:scale-100 disabled:opacity-50',
                    interactionType === 'reply' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-amber-500 hover:bg-amber-600',
                  )}
                >
                  <Send className="h-4 w-4" />
                  {interactionType === 'reply' ? 'Send Reply' : 'Add Note'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Requester</h3>
            <div className="space-y-3 text-sm">
              <SnapshotRow label="Name" value={requesterName} />
              <SnapshotRow label="Email" value={requesterEmail || 'Not available'} />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket Actions</h3>
            {!isReadOnly ? (
              <>
                <button
                  onClick={() => void handleAssignToMe()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign to Me
                </button>
                <button
                  onClick={() => void handleStartWork()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <PlayCircle className="h-4 w-4" />
                  Start Work
                </button>
                {canMoveToWaiting ? (
                  <button
                    onClick={() => void handleWaitingOnCustomer()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-2.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100"
                  >
                    <Users className="h-4 w-4" />
                    Waiting on Customer
                  </button>
                ) : null}
                <button
                  onClick={() => void handleResolve()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Resolved
                </button>
                {canReopen ? (
                  <button
                    onClick={() => void handleReopen()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reopen Ticket
                  </button>
                ) : null}
                {role === 'Support Engineer' ? (
                  <button
                    onClick={() => void handleEscalate()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Escalate to Project Lead
                  </button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">Project managers can review tickets here but cannot reply or change ticket state.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Attachments</h3>
            <div className="space-y-3">
              {ticketAttachments.length === 0 ? (
                <p className="text-sm text-slate-500">No ticket attachments yet.</p>
              ) : (
                ticketAttachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => void handleDownloadAttachment(attachment.id, attachment.originalName)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{attachment.originalName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatBytes(attachment.sizeBytes)} | {formatDateTime(attachment.createdAt)}
                      </p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 text-slate-500" />
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Activity</h3>
            <div className="space-y-3">
              {emailEvents.length === 0 ? (
                <p className="text-sm text-slate-500">No email activity has been logged for this ticket yet.</p>
              ) : (
                emailEvents.map((emailEvent) => (
                  <div key={emailEvent.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <p className="truncate text-sm font-semibold text-slate-900">{emailEvent.subject}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {humanizeEnum(emailEvent.direction)} | {humanizeEnum(emailEvent.status)}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-slate-400">{formatDateTime(emailEvent.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {emailEvent.fromEmail} to {emailEvent.toEmail}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{emailEvent.bodyText}</p>
                    {emailEvent.errorMessage ? <p className="mt-2 text-xs text-rose-600">{emailEvent.errorMessage}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket Snapshot</h3>
            <div className="space-y-3 text-sm">
              <SnapshotRow label="Ticket" value={ticket.displayId} />
              <SnapshotRow label="Source" value={ticket.source ? humanizeEnum(ticket.source) : 'Widget'} />
              <SnapshotRow label="Client" value={ticket.project?.client?.name || '-'} />
              <SnapshotRow label="Project" value={ticket.project?.name || '-'} />
              <SnapshotRow label="Requester" value={requesterName} />
              <SnapshotRow label="Assigned To" value={ticket.assignedTo?.name || 'Unassigned'} />
              <SnapshotRow label="Created" value={formatDateTime(ticket.createdAt)} />
              <SnapshotRow label="Resolved" value={ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : 'Not resolved'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 animate-pulse">
      <div className="h-8 w-80 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="h-48 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-56 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
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
