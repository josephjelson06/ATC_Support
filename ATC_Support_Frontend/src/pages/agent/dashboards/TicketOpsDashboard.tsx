import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RotateCcw, Ticket, UserPlus, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import PageHeader from '../../../components/layout/PageHeader';
import { useModal } from '../../../contexts/ModalContext';
import { useRole } from '../../../contexts/RoleContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../../lib/api';
import { formatRelativeTime, formatRoleLabel, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../../lib/format';
import { appPaths } from '../../../lib/navigation';
import type { ApiTicket, ApiUser, TicketPriority, TicketStatus } from '../../../lib/types';

const DAY_WINDOW = 7;

type DashboardMode = 'dispatch' | 'assigned';

export default function TicketOpsDashboard() {
  const { backendRole, supportLevel, user, permissions } = useRole();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);
  const canAssignToSelf = permissions?.canAssignTicketsToSelf ?? false;
  const canAssignToOthers = permissions?.canAssignTicketsToOthers ?? false;
  const dashboardMode: DashboardMode = backendRole === 'PM' || supportLevel === 'SE1' ? 'dispatch' : 'assigned';

  const assignableUsersQuery = useAsyncData(
    async () => (canAssignToOthers ? apiFetch<ApiUser[]>('/users?status=ACTIVE') : []),
    [canAssignToOthers],
  );

  if (ticketsQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (ticketsQuery.error || !ticketsQuery.data) {
    return <DashboardError message={ticketsQuery.error || 'Unable to load dashboard.'} onRetry={ticketsQuery.reload} />;
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - (DAY_WINDOW - 1));
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const tickets = ticketsQuery.data;
  const scopedTickets = dashboardMode === 'dispatch' ? tickets : tickets.filter((ticket) => ticket.assignedTo?.id === user?.id);
  const openTickets = scopedTickets.filter((ticket) => ticket.status !== 'RESOLVED');
  const unassignedTickets = tickets.filter((ticket) => ticket.status !== 'RESOLVED' && !ticket.assignedToId);
  const inProgressTickets = scopedTickets.filter((ticket) => ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(ticket.status)).length;
  const waitingTickets = scopedTickets.filter((ticket) => ['WAITING_ON_CUSTOMER', 'ESCALATED'].includes(ticket.status)).length;
  const resolvedThisWeek = scopedTickets.filter((ticket) => ticket.status === 'RESOLVED' && ticket.resolvedAt && new Date(ticket.resolvedAt) >= sevenDaysAgo).length;
  const newAssignedToMe = scopedTickets.filter((ticket) => ticket.status === 'ASSIGNED' || ticket.status === 'REOPENED').length;

  const tableTickets = [...openTickets].sort((left, right) => {
    if (dashboardMode === 'dispatch') {
      const unassignedRank = Number(Boolean(left.assignedToId)) - Number(Boolean(right.assignedToId));
      if (unassignedRank !== 0) {
        return unassignedRank;
      }

      const newStatusRank = Number(right.status === 'NEW') - Number(left.status === 'NEW');
      if (newStatusRank !== 0) {
        return newStatusRank;
      }
    }

    const priorityRank = priorityWeight(right.priority) - priorityWeight(left.priority);
    if (priorityRank !== 0) {
      return priorityRank;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  }).slice(0, 8);

  const weeklyStackedData = Array.from({ length: DAY_WINDOW }, (_, index) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + index);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const dayTickets = scopedTickets.filter((ticket) => {
      const createdAt = new Date(ticket.createdAt);
      return createdAt >= date && createdAt < nextDate;
    });

    return {
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      newTickets: dayTickets.filter((ticket) => ticket.status === 'NEW').length,
      activeTickets: dayTickets.filter((ticket) => ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(ticket.status)).length,
      waitingTickets: dayTickets.filter((ticket) => ['WAITING_ON_CUSTOMER', 'ESCALATED'].includes(ticket.status)).length,
      resolvedTickets: dayTickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    };
  });

  const config =
    dashboardMode === 'dispatch'
      ? {
          title: 'Operations Dashboard',
          description: 'Review open ticket load, dispatch unassigned work, and track weekly status trends.',
          tableTitle: 'Open & Unassigned Tickets',
          tableDescription: 'Unassigned work surfaces first so PM and SE1 can assign it directly from the dashboard.',
          listPath: appPaths.tickets.queue,
          listLabel: 'Open queue',
          kpis: [
            { label: 'Open Tickets', value: String(openTickets.length), note: 'Accessible unresolved workload', icon: Ticket, accent: 'orange' as const },
            { label: 'Unassigned', value: String(unassignedTickets.length), note: 'Needs dispatch now', icon: UserPlus, accent: 'amber' as const },
            { label: 'In Progress', value: String(inProgressTickets), note: 'Already in active workflow', icon: Workflow, accent: 'blue' as const },
            { label: 'Waiting', value: String(waitingTickets), note: 'Customer or escalation hold', icon: Clock3, accent: 'slate' as const },
            { label: 'Resolved', value: String(resolvedThisWeek), note: 'Resolved in last 7 days', icon: CheckCircle2, accent: 'green' as const },
          ],
        }
      : {
          title: 'Engineer Dashboard',
          description: 'Focus on your assigned workload and review your weekly delivery trend.',
          tableTitle: 'Assigned Tickets',
          tableDescription: 'Tickets currently in your lane, sorted by urgency for quick action.',
          listPath: appPaths.tickets.mine,
          listLabel: 'Open my tickets',
          kpis: [
            { label: 'Assigned', value: String(openTickets.length), note: 'Currently owned by you', icon: Ticket, accent: 'orange' as const },
            { label: 'New to You', value: String(newAssignedToMe), note: 'Assigned or reopened', icon: AlertTriangle, accent: 'amber' as const },
            { label: 'In Progress', value: String(scopedTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length), note: 'Active engineering work', icon: Workflow, accent: 'blue' as const },
            { label: 'Waiting', value: String(waitingTickets), note: 'Paused for customer input', icon: Clock3, accent: 'slate' as const },
            { label: 'Resolved', value: String(resolvedThisWeek), note: 'Resolved in last 7 days', icon: CheckCircle2, accent: 'green' as const },
          ],
        };

  const getAssignableUsersForTicket = (ticket: ApiTicket) =>
    (assignableUsersQuery.data || [])
      .filter((listedUser) => listedUser.status === 'ACTIVE')
      .filter((listedUser) => {
        if (listedUser.role === 'PM') {
          return true;
        }

        if (listedUser.scopeMode !== 'PROJECT_SCOPED') {
          return true;
        }

        return (listedUser.projectMemberships || []).some((membership) => membership.projectId === ticket.projectId);
      })
      .sort((left, right) =>
        `${left.role}-${left.supportLevel || ''}-${left.name}`.localeCompare(`${right.role}-${right.supportLevel || ''}-${right.name}`),
      );

  const updateAssignment = async (ticketId: number, assignedToId: number | null | undefined, successMessage: string) => {
    try {
      await apiFetch(`/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: assignedToId === undefined ? {} : { assignedToId },
      });
      await ticketsQuery.reload();
      showToast('success', successMessage);
    } catch (error) {
      showToast('error', getErrorMessage(error));
      throw error;
    }
  };

  const handleAssignToMe = async (ticket: ApiTicket) => {
    if (!user) {
      return;
    }

    await updateAssignment(ticket.id, user.id, 'Ticket assigned to you.');
  };

  const openAssignmentModal = (ticket: ApiTicket) => {
    openModal({
      title: `Assign ${ticket.displayId}`,
      size: 'sm',
      content: (
        <DashboardAssignmentModalContent
          ticket={ticket}
          currentUserId={user?.id ?? null}
          canAssignToSelf={canAssignToSelf}
          canAssignToOthers={canAssignToOthers}
          assignableUsers={getAssignableUsersForTicket(ticket)}
          isLoadingAssignees={assignableUsersQuery.isLoading}
          onAssignToMe={() => void handleAssignToMe(ticket).then(closeModal)}
          onAssignToUser={(assignedToId) => void updateAssignment(ticket.id, assignedToId, 'Ticket assignment updated.').then(closeModal)}
          onReturnToQueue={() => void updateAssignment(ticket.id, null, 'Ticket returned to queue.').then(closeModal)}
        />
      ),
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title={config.title}
        description={config.description}
        breadcrumbs={[
          { label: 'Operations', to: appPaths.dashboard },
          { label: 'Dashboard' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {config.kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} note={kpi.note} icon={kpi.icon} accent={kpi.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">{config.tableTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">{config.tableDescription}</p>
            </div>
            <Link
              to={config.listPath}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {config.listLabel}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  {['Ticket', 'Client', 'Project', 'Status', 'Assigned To', 'Received'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-sm text-slate-500">
                      {dashboardMode === 'dispatch'
                        ? 'No open tickets are waiting for dispatch right now.'
                        : 'No assigned tickets are waiting on you right now.'}
                    </td>
                  </tr>
                ) : (
                  tableTickets.map((ticket) => (
                    <tr key={ticket.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          <Link to={appPaths.tickets.detail(ticket.id)} className="block">
                            <p className="font-bold text-slate-900 transition-colors hover:text-orange-600">{ticket.title}</p>
                            <p className="mt-1 font-mono text-xs text-orange-600">{ticket.displayId}</p>
                          </Link>
                          {dashboardMode === 'dispatch' && ticket.status !== 'RESOLVED' ? (
                            <div className="flex flex-wrap gap-2">
                              {canAssignToSelf && user && ticket.assignedToId !== user.id ? (
                                <button
                                  type="button"
                                  onClick={() => void handleAssignToMe(ticket)}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <UserPlus className="h-3 w-3" />
                                Assign to Me
                                </button>
                              ) : null}
                              {canAssignToOthers ? (
                                <button
                                  type="button"
                                  onClick={() => openAssignmentModal(ticket)}
                                className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700 transition-colors hover:bg-orange-100"
                              >
                                <RotateCcw className="h-3 w-3" />
                                {ticket.assignedToId ? 'Reassign' : 'Assign'}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{ticket.project?.client?.name || '-'}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{ticket.project?.name || '-'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${getTicketStatusClasses(ticket.status)}`}>
                            {humanizeEnum(ticket.status)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                            {humanizeEnum(ticket.priority)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{ticket.assignedTo?.name || 'Unassigned'}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{formatRelativeTime(ticket.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">Weekly Status Mix</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Stacked ticket flow (7 days)</h2>
          <p className="mt-1 text-sm text-slate-500">
            {dashboardMode === 'dispatch'
              ? 'Open queue movement across the last seven days.'
              : 'Your assigned-ticket movement across the last seven days.'}
          </p>

          <div className="mt-6 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStackedData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} />
                <Tooltip content={<StackedTooltip />} />
                <Bar dataKey="newTickets" stackId="tickets" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="activeTickets" stackId="tickets" fill="#2563eb" />
                <Bar dataKey="waitingTickets" stackId="tickets" fill="#a855f7" />
                <Bar dataKey="resolvedTickets" stackId="tickets" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardAssignmentModalContent({
  ticket,
  currentUserId,
  canAssignToSelf,
  canAssignToOthers,
  assignableUsers,
  isLoadingAssignees,
  onAssignToMe,
  onAssignToUser,
  onReturnToQueue,
}: {
  ticket: ApiTicket;
  currentUserId: number | null;
  canAssignToSelf: boolean;
  canAssignToOthers: boolean;
  assignableUsers: ApiUser[];
  isLoadingAssignees: boolean;
  onAssignToMe: () => void;
  onAssignToUser: (assignedToId: number) => void;
  onReturnToQueue: () => void;
}) {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(ticket.assignedToId ? String(ticket.assignedToId) : '');
  const showAssignToMe = canAssignToSelf && currentUserId && ticket.assignedToId !== currentUserId;
  const canReturnToQueue = Boolean(ticket.assignedToId);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{ticket.title}</p>
        <p className="mt-1 text-xs text-slate-500">
          {ticket.displayId} | {ticket.project?.client?.name || 'No client'} | {ticket.project?.name || 'No project'}
        </p>
      </div>

      {showAssignToMe ? (
        <button
          type="button"
          onClick={onAssignToMe}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <UserPlus className="h-4 w-4" />
          Assign to Me
        </button>
      ) : null}

      {canAssignToOthers ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Assign or Reassign</p>
            <p className="mt-1 text-sm text-slate-600">Only active users inside ticket scope appear in this list.</p>
          </div>

          {isLoadingAssignees ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading assignable users...</div>
          ) : (
            <>
              <select
                value={selectedAssigneeId}
                onChange={(event) => setSelectedAssigneeId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select an assignee</option>
                {assignableUsers.map((assignableUser) => (
                  <option key={assignableUser.id} value={assignableUser.id}>
                    {assignableUser.name} ({formatRoleLabel(assignableUser.role, assignableUser.supportLevel)})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (!selectedAssigneeId) {
                    return;
                  }

                  onAssignToUser(Number(selectedAssigneeId));
                }}
                disabled={!selectedAssigneeId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                <UserPlus className="h-4 w-4" />
                {ticket.assignedToId ? 'Update Assignment' : 'Assign Ticket'}
              </button>
            </>
          )}
        </div>
      ) : null}

      {canReturnToQueue && canAssignToOthers ? (
        <button
          type="button"
          onClick={onReturnToQueue}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Return to Queue
        </button>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Ticket;
  accent: 'orange' | 'amber' | 'blue' | 'slate' | 'green';
}) {
  const tone =
    accent === 'green'
      ? 'border-green-200 bg-green-50 text-green-700'
      : accent === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : accent === 'slate'
          ? 'border-slate-200 bg-slate-100 text-slate-700'
          : accent === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-orange-200 bg-orange-50 text-orange-700';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{note}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StackedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const labels: Record<string, string> = {
    newTickets: 'New',
    activeTickets: 'Active',
    waitingTickets: 'Waiting / Escalated',
    resolvedTickets: 'Resolved',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <div className="mt-2 space-y-2">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || '#cbd5e1' }} />
              <span className="font-semibold">{labels[String(entry.dataKey)] || String(entry.dataKey)}</span>
            </div>
            <span className="font-black text-slate-900">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function priorityWeight(priority: TicketPriority) {
  switch (priority) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    default:
      return 1;
  }
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-8 w-64 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 rounded-3xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        <div className="h-96 rounded-3xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-96 rounded-3xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-black text-slate-900">Dashboard unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}
