import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Clock, ExternalLink, FileEdit, MessageSquare, Sparkles, Ticket, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { createDraftSuggestion, dismissDraftIds } from '../../lib/drafts';
import { formatDateTime, humanizeEnum } from '../../lib/format';
import type { ApiRunbook, ApiTicket, KnowledgeStatus } from '../../lib/types';

export default function AutoDraftDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { showToast } = useToast();

  const draftQuery = useAsyncData(
    async () => {
      if (!id) {
        throw new Error('Draft ticket ID is missing.');
      }

      const ticket = await apiFetch<ApiTicket>(`/tickets/${id}`);
      return {
        ticket,
        draft: createDraftSuggestion(ticket),
      };
    },
    [id],
  );

  const persistRunbook = (status: KnowledgeStatus) => {
    if (!draftQuery.data) {
      return;
    }

    openModal({
      title: status === 'PUBLISHED' ? 'Publish Runbook' : 'Save Draft Runbook',
      content: (
        <p className="text-sm text-slate-600">
          {status === 'PUBLISHED' ? 'Publish' : 'Save'} <span className="font-bold text-slate-900">{draftQuery.data.draft.title}</span>{' '}
          {status === 'PUBLISHED' ? 'to the live knowledge base' : 'as draft knowledge'}?
        </p>
      ),
      primaryAction: {
        label: status === 'PUBLISHED' ? 'Publish' : 'Save as Draft',
        onClick: async () => {
          try {
            const savedRunbook = await apiFetch<ApiRunbook>('/runbooks', {
              method: 'POST',
              body: {
                title: draftQuery.data!.draft.title,
                category: draftQuery.data!.draft.category,
                content: draftQuery.data!.draft.content,
                status,
              },
            });

            dismissDraftIds([draftQuery.data!.ticket.id]);
            showToast('success', status === 'PUBLISHED' ? 'Runbook published to the knowledge base.' : 'Runbook saved as draft.');
            navigate(status === 'PUBLISHED' ? '/agent/kb' : `/agent/kb/edit/${savedRunbook.id}`);
          } catch (error) {
            showToast('error', getErrorMessage(error));
            throw error;
          }
        },
      },
      secondaryAction: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  const handleReject = () => {
    if (!draftQuery.data) {
      return;
    }

    openModal({
      title: 'Dismiss Draft Suggestion',
      content: (
        <p className="text-sm text-slate-600">
          Remove this draft suggestion from the queue? You can regenerate it later from the resolved ticket if needed.
        </p>
      ),
      primaryAction: {
        label: 'Dismiss',
        variant: 'danger',
        onClick: () => {
          dismissDraftIds([draftQuery.data!.ticket.id]);
          showToast('success', 'Draft suggestion dismissed.');
          navigate('/agent/kb/review');
        },
      },
      secondaryAction: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  if (draftQuery.isLoading) {
    return <AutoDraftSkeleton />;
  }

  if (draftQuery.error || !draftQuery.data) {
    return <AutoDraftError message={draftQuery.error || 'Unable to load the draft suggestion.'} onRetry={draftQuery.reload} />;
  }

  const { ticket, draft } = draftQuery.data;
  const transcript = [...(ticket.messages || []), ...((ticket.chatSession?.messages as never[]) || [])]
    .sort((left: { createdAt: string }, right: { createdAt: string }) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link to="/agent/kb/review" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            {'<-'} Back to Review Queue
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-3 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Review Draft Suggestion
          </h1>
          <p className="text-sm text-slate-500 mt-1">This runbook draft is generated from a resolved support ticket.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/agent/kb/new?draftTicketId=${ticket.id}`}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Edit Manually
          </Link>
          <button
            onClick={handleReject}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Dismiss
          </button>
          <button
            onClick={() => persistRunbook('DRAFT')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors"
          >
            <FileEdit className="w-4 h-4" />
            Save as Draft
          </button>
          <button
            onClick={() => persistRunbook('PUBLISHED')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            Publish Runbook
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-orange-600" />
                Source Ticket
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/agent/ticket/${ticket.id}`} className="font-mono font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1">
                  {ticket.displayId}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  {humanizeEnum(ticket.status)}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  {humanizeEnum(ticket.priority)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{ticket.title}</h3>
                <p className="text-sm text-slate-500 mt-2">{ticket.description || 'No ticket description was provided.'}</p>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                {ticket.project ? <p>Project: {ticket.project.name}</p> : null}
                {ticket.project?.client ? <p>Client: {ticket.project.client.name}</p> : null}
                {ticket.assignedTo ? <p>Resolved By: {ticket.assignedTo.name}</p> : null}
                {ticket.resolutionSummary ? <p>Resolution Summary: {ticket.resolutionSummary}</p> : null}
                <p>Created: {formatDateTime(ticket.createdAt)}</p>
                {ticket.resolvedAt ? <p>Resolved: {formatDateTime(ticket.resolvedAt)}</p> : null}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Resolution Timeline
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {transcript.length === 0 ? (
                <p className="text-sm text-slate-500">No timeline messages were recorded for this ticket.</p>
              ) : (
                transcript.map((entry: { id?: number; content: string; createdAt: string; type?: string; role?: string; user?: { name: string } | null }, index) => (
                  <div key={`${entry.createdAt}-${index}`} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">
                        {entry.user?.name || humanizeEnum(entry.role || entry.type || 'system')}
                      </p>
                      <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{entry.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-purple-700 uppercase tracking-wider">Draft Suggestion</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">{draft.title}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Confidence</p>
                <p className="text-2xl font-black text-green-600">{draft.confidence}%</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider">
                {draft.category}
              </span>
              <span className="text-xs text-slate-400">Generated from {draft.ticketDisplayId}</span>
            </div>
          </div>
          <div className="p-6 prose prose-slate max-w-none">
            <Markdown>{draft.content}</Markdown>
          </div>
        </section>
      </div>
    </div>
  );
}

function AutoDraftSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-12 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="space-y-6">
          <div className="h-72 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-96 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        </div>
        <div className="h-[44rem] bg-white rounded-2xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
}

function AutoDraftError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Draft unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
