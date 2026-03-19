import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Lock, MessageSquare, PlayCircle, Send, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatDateTime, formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ticketQuery = useAsyncData(() => apiFetch<ApiTicket>(`/tickets/${ticketId}`), [ticketId]);

  const isReadOnly = role === 'Project Manager';
  const timeline = useMemo(
    () => (ticketQuery.data?.messages || []).slice().sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    [ticketQuery.data?.messages],
  );

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

  const handleSendInteraction = async () => {
    if (!messageText.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch(`/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: {
          content: messageText.trim(),
          type: (interactionType === 'reply' ? 'REPLY' : 'INTERNAL_NOTE') as TicketMessageType,
        },
      });

      setMessageText('');
      ticketQuery.reload();
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/agent/queue" className="group flex items-center gap-2 text-slate-500 hover:text-orange-600 font-bold text-sm transition-colors">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Queue
          </Link>
          <div className="h-6 w-px bg-slate-200 hidden md:block" />
          <h1 className="text-2xl font-bold text-slate-900">{ticket.displayId}</h1>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>
            {humanizeEnum(ticket.status)}
          </span>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>
            {humanizeEnum(ticket.priority)}
          </span>
        </div>
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <Clock3 className="w-4 h-4" />
          Created {formatRelativeTime(ticket.createdAt)}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">{ticket.title}</h2>
            <p className="text-sm text-slate-600 mt-4 whitespace-pre-wrap leading-relaxed">
              {ticket.description || 'No description provided.'}
            </p>
            {ticket.resolutionSummary ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-widest text-green-700">Resolution Summary</p>
                <p className="mt-2 text-sm text-green-900 whitespace-pre-wrap">{ticket.resolutionSummary}</p>
              </div>
            ) : null}
          </div>

          {ticket.chatSession?.messages?.length ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Original Chat Transcript</h3>
              </div>
              <div className="p-5 space-y-4 bg-slate-50/50">
                {ticket.chatSession.messages.map((message) => (
                  <div key={message.id} className={clsx('flex gap-3', message.role === 'JULIA' && 'flex-row-reverse')}>
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                        message.role === 'JULIA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700',
                      )}
                    >
                      {message.role === 'JULIA' ? 'J' : 'C'}
                    </div>
                    <div className={clsx('max-w-[80%]', message.role === 'JULIA' && 'items-end')}>
                      <div className={clsx('p-3 rounded-xl border shadow-sm text-sm', message.role === 'JULIA' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700')}>
                        {message.content}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(message.createdAt)}</p>
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-sm text-slate-500">
                  No internal timeline entries yet.
                </div>
              ) : (
                timeline.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {entry.type === 'INTERNAL_NOTE' ? <Lock className="w-4 h-4 text-amber-600" /> : <MessageSquare className="w-4 h-4 text-orange-600" />}
                        <p className="text-sm font-bold text-slate-900">{entry.user?.name || 'System'}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entry.type === 'INTERNAL_NOTE' ? 'bg-amber-100 text-amber-700' : entry.type === 'SYSTEM' ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                          {humanizeEnum(entry.type || 'SYSTEM')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</p>
                    </div>
                    <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {ticket.escalationHistory?.length ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Escalation History</h3>
                <span className="text-xs text-slate-400">{ticket.escalationHistory.length} event{ticket.escalationHistory.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-4">
                {ticket.escalationHistory.map((event) => (
                  <div key={event.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-slate-900">{event.createdBy?.name || 'System'} escalated the ticket</p>
                      <p className="text-xs text-slate-400">{formatDateTime(event.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {humanizeEnum(event.fromStatus)} → {humanizeEnum(event.toStatus)}
                    </p>
                    {event.note ? <p className="mt-2 text-sm text-slate-500 whitespace-pre-wrap">{event.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isReadOnly && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50/50">
                <button
                  onClick={() => setInteractionType('reply')}
                  className={clsx(
                    'flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all',
                    interactionType === 'reply' ? 'bg-white text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reply to Client
                </button>
                <button
                  onClick={() => setInteractionType('note')}
                  className={clsx(
                    'flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all',
                    interactionType === 'note' ? 'bg-white text-amber-600 border-b-2 border-amber-600' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Internal Note
                </button>
              </div>
              <div className="p-4">
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder={interactionType === 'reply' ? 'Type your reply to the client...' : 'Type an internal note...'}
                  className="w-full resize-none outline-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent"
                />
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => void handleSendInteraction()}
                  disabled={!messageText.trim() || isSubmitting}
                  className={clsx(
                    'px-6 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:scale-100',
                    interactionType === 'reply' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-amber-500 hover:bg-amber-600',
                  )}
                >
                  <Send className="w-4 h-4" />
                  {interactionType === 'reply' ? 'Send Reply' : 'Add Note'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket Actions</h3>
            {!isReadOnly && (
              <>
                <button
                  onClick={() => void handleAssignToMe()}
                  className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign to Me
                </button>
                <button
                  onClick={() => void handleStartWork()}
                  className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  Start Work
                </button>
                <button
                  onClick={() => void handleResolve()}
                  className="w-full py-2.5 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Resolved
                </button>
                {role === 'Support Engineer' && (
                  <button
                    onClick={() => void handleEscalate()}
                    className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Escalate to Project Lead
                  </button>
                )}
              </>
            )}
            {isReadOnly && <p className="text-sm text-slate-500">Project managers can review tickets here but cannot reply or change ticket state.</p>}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Ticket Snapshot</h3>
            <div className="space-y-3 text-sm">
              <SnapshotRow label="Ticket" value={ticket.displayId} />
              <SnapshotRow label="Source" value={ticket.source ? humanizeEnum(ticket.source) : 'Widget'} />
              <SnapshotRow label="Client" value={ticket.project?.client?.name || '—'} />
              <SnapshotRow label="Project" value={ticket.project?.name || '—'} />
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
      <span className="font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-80 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="h-48 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-72 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-56 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-72 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function TicketError({ message, onRetry, retryLabel = 'Retry' }: { message: string; onRetry: () => void; retryLabel?: string }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Ticket unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
