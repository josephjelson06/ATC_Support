import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, CheckCircle2, Clock, FileEdit, RefreshCw, Search, Sparkles, Ticket, Trash2 } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { buildDraftQueue, dismissDraftIds, type DraftSuggestion } from '../../lib/drafts';
import { formatRelativeTime } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type { ApiRunbook, ApiTicket, KnowledgeStatus } from '../../lib/types';

export default function ReviewQueue() {
  const location = useLocation();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrafts, setSelectedDrafts] = useState<number[]>([]);
  const isAutoDraftsView = location.pathname.endsWith('/auto-drafts');

  const reviewQuery = useAsyncData(
    async () => {
      const [tickets, runbooks] = await Promise.all([
        apiFetch<ApiTicket[]>('/reports/tickets?status=RESOLVED'),
        apiFetch<ApiRunbook[]>('/runbooks'),
      ]);

      return {
        drafts: buildDraftQueue(tickets, runbooks),
        runbooks,
      };
    },
    [],
  );

  const visibleDrafts = useMemo(() => {
    const drafts = reviewQuery.data?.drafts || [];

    if (!searchQuery.trim()) {
      return drafts;
    }

    const search = searchQuery.toLowerCase();
    return drafts.filter((draft) =>
      `${draft.title} ${draft.ticketDisplayId} ${draft.category} ${draft.summary}`.toLowerCase().includes(search),
    );
  }, [reviewQuery.data?.drafts, searchQuery]);

  const averageConfidence =
    visibleDrafts.length === 0
      ? 0
      : Math.round(visibleDrafts.reduce((sum, draft) => sum + draft.confidence, 0) / visibleDrafts.length);

  const handleToggleSelect = (ticketId: number) => {
    setSelectedDrafts((current) =>
      current.includes(ticketId) ? current.filter((id) => id !== ticketId) : [...current, ticketId],
    );
  };

  const createRunbooksFromDrafts = async (drafts: DraftSuggestion[], status: KnowledgeStatus) => {
    await Promise.all(
      drafts.map((draft) =>
        apiFetch('/runbooks', {
          method: 'POST',
          body: {
            title: draft.title,
            category: draft.category,
            content: draft.content,
            status,
          },
        }),
      ),
    );
  };

  const handleReject = (draft: DraftSuggestion) => {
    openModal({
      title: 'Dismiss Draft Suggestion',
      content: (
        <p className="text-sm text-slate-600">
          Remove <span className="font-bold text-slate-900">{draft.title}</span> from the review queue? You can regenerate it later from the resolved ticket if needed.
        </p>
      ),
      primaryAction: {
        label: 'Dismiss',
        variant: 'danger',
        onClick: () => {
          dismissDraftIds([draft.ticketId]);
          setSelectedDrafts((current) => current.filter((id) => id !== draft.ticketId));
          reviewQuery.reload();
          showToast('success', 'Draft suggestion dismissed.');
        },
      },
      secondaryAction: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  const handleBulkPersist = (status: KnowledgeStatus) => {
    const selectedItems = visibleDrafts.filter((draft) => selectedDrafts.includes(draft.ticketId));

    if (selectedItems.length === 0) {
      showToast('warning', `Select at least one draft to ${status === 'PUBLISHED' ? 'publish' : 'save as draft'}.`);
      return;
    }

    openModal({
      title: status === 'PUBLISHED' ? 'Publish Drafts' : 'Save Drafts',
      content: (
        <p className="text-sm text-slate-600">
          {status === 'PUBLISHED' ? 'Publish' : 'Save'} <span className="font-bold text-slate-900">{selectedItems.length}</span> draft
          {selectedItems.length === 1 ? '' : 's'} as {status === 'PUBLISHED' ? 'published runbooks' : 'draft runbooks'}?
        </p>
      ),
      primaryAction: {
        label: status === 'PUBLISHED' ? 'Publish' : 'Save as Draft',
        onClick: async () => {
          try {
            await createRunbooksFromDrafts(selectedItems, status);
            dismissDraftIds(selectedItems.map((draft) => draft.ticketId));
            setSelectedDrafts([]);
            reviewQuery.reload();
            showToast('success', `${selectedItems.length} runbook${selectedItems.length === 1 ? '' : 's'} ${status === 'PUBLISHED' ? 'published' : 'saved as draft'}.`);
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

  if (reviewQuery.isLoading) {
    return <ReviewSkeleton />;
  }

  if (reviewQuery.error || !reviewQuery.data) {
    return <ReviewError message={reviewQuery.error || 'Unable to load draft suggestions.'} onRetry={reviewQuery.reload} />;
  }

  const draftRunbooks = reviewQuery.data.runbooks.filter((runbook) => runbook.status === 'DRAFT').length;
  const publishedRunbooks = reviewQuery.data.runbooks.filter((runbook) => runbook.status === 'PUBLISHED').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={isAutoDraftsView ? 'Auto Draft Signals' : 'Draft Review Queue'}
        description={
          isAutoDraftsView
            ? 'Resolved tickets that suggest new runbook opportunities, grouped for fast review.'
            : 'Resolved tickets become draft knowledge suggestions that can be saved as draft content or published immediately.'
        }
        badges={
          isAutoDraftsView ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-purple-700">
              <Sparkles className="h-3.5 w-3.5" />
              Auto Draft Feed
            </span>
          ) : undefined
        }
        actions={
          <>
            <button
              onClick={() => reviewQuery.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => handleBulkPersist('DRAFT')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors"
            >
              <FileEdit className="w-4 h-4" />
              Save Selected as Draft
            </button>
            <button
              onClick={() => handleBulkPersist('PUBLISHED')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Publish Selected
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Pending Drafts" value={String(visibleDrafts.length)} accent="purple" />
        <StatCard label="Avg Confidence" value={`${averageConfidence}%`} accent="green" />
        <StatCard label="Draft Runbooks" value={String(draftRunbooks)} accent="blue" />
        <StatCard label="Published Runbooks" value={String(publishedRunbooks)} accent="blue" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title, ticket ID, category, or summary..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    checked={visibleDrafts.length > 0 && selectedDrafts.length === visibleDrafts.length}
                    onChange={(event) => setSelectedDrafts(event.target.checked ? visibleDrafts.map((draft) => draft.ticketId) : [])}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Draft Title</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source Ticket</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Confidence</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleDrafts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No draft suggestions are waiting for review.
                  </td>
                </tr>
              ) : (
                visibleDrafts.map((draft) => (
                  <tr key={draft.ticketId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        checked={selectedDrafts.includes(draft.ticketId)}
                        onChange={() => handleToggleSelect(draft.ticketId)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <Link to={appPaths.kb.autoDraft(draft.ticketId)} className="font-bold text-slate-900 hover:text-purple-600 transition-colors">
                          {draft.title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">{draft.summary}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={appPaths.tickets.detail(draft.ticketId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-[10px] font-bold transition-colors uppercase tracking-wider"
                      >
                        <Ticket className="w-3 h-3" />
                        {draft.ticketDisplayId}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-full">{draft.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${draft.confidence}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-700">{draft.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {formatRelativeTime(draft.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={appPaths.kb.autoDraft(draft.ticketId)}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors"
                        >
                          Review
                        </Link>
                        <button
                          onClick={() => handleReject(draft)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: 'purple' | 'green' | 'blue' }) {
  const theme =
    accent === 'purple'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : accent === 'green'
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className={`rounded-2xl border shadow-sm p-6 ${theme}`}>
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-black mt-2">{value}</p>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-72 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="h-12 bg-white rounded-xl border border-slate-200 shadow-sm" />
      <div className="h-[30rem] bg-white rounded-xl border border-slate-200 shadow-sm" />
    </div>
  );
}

function ReviewError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Draft queue unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
