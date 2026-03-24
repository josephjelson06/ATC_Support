import { Link } from 'react-router-dom';
import { Grid2X2, Shield, Users } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { appPaths } from '../../lib/navigation';
import type { ApiUser, PaginatedResponse } from '../../lib/types';

export default function UsersAccessOverview() {
  const summaryQuery = useAsyncData(async () => {
    const [allUsers, activeUsers, inactiveUsers] = await Promise.all([
      apiFetch<PaginatedResponse<ApiUser>>('/users?page=1&pageSize=1'),
      apiFetch<PaginatedResponse<ApiUser>>('/users?page=1&pageSize=1&status=ACTIVE'),
      apiFetch<PaginatedResponse<ApiUser>>('/users?page=1&pageSize=1&status=INACTIVE'),
    ]);

    return {
      totalUsers: allUsers.total,
      activeUsers: activeUsers.total,
      inactiveUsers: inactiveUsers.total,
    };
  }, []);

  if (summaryQuery.isLoading) {
    return <UsersAccessSkeleton />;
  }

  if (summaryQuery.error || !summaryQuery.data) {
    return <UsersAccessError message={summaryQuery.error || 'Unable to load user directory summary.'} onRetry={summaryQuery.reload} />;
  }

  const { totalUsers, activeUsers, inactiveUsers } = summaryQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader title="Users & Access" description="Manage operator accounts, role definitions, and the live permission matrix." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Total Users" value={String(totalUsers)} accent="orange" />
        <MetricCard icon={Users} label="Active Users" value={String(activeUsers)} accent="green" />
        <MetricCard icon={Users} label="Inactive Users" value={String(inactiveUsers)} accent="slate" />
        <MetricCard icon={Shield} label="Roles" value="3" accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OverviewCard
          to={appPaths.admin.users}
          icon={Users}
          title="Users"
          description="Create, update, deactivate, and audit operator accounts."
          chips={[`${totalUsers} total`, `${activeUsers} active`, `${inactiveUsers} inactive`]}
          tone="orange"
        />
        <OverviewCard
          to={appPaths.admin.roles}
          icon={Shield}
          title="Roles"
          description="Understand the current PM / PL / SE role model used by route visibility and actions."
          chips={['PM', 'PL', 'SE']}
          tone="blue"
        />
        <OverviewCard
          to={appPaths.admin.permissions}
          icon={Grid2X2}
          title="Permission Matrix"
          description="Single-page reference for what each role can see and do across the console."
          chips={['7 capabilities']}
          tone="slate"
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green' | 'slate';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : accent === 'slate'
          ? 'bg-slate-100 text-slate-700'
          : 'bg-orange-50 text-orange-600';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function OverviewCard({
  to,
  icon: Icon,
  title,
  description,
  chips,
  tone,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  description: string;
  chips: string[];
  tone: 'orange' | 'blue' | 'slate';
}) {
  const iconTone =
    tone === 'blue'
      ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
      : tone === 'slate'
        ? 'bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white'
        : 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white';

  return (
    <Link to={to} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-orange-300 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${iconTone}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
          Administration
        </span>
      </div>
      <h2 className="text-lg font-bold text-slate-900 mt-5 group-hover:text-orange-600 transition-colors">{title}</h2>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {chips.map((chip) => (
          <span key={chip} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
            {chip}
          </span>
        ))}
      </div>
    </Link>
  );
}

function UsersAccessSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-64 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function UsersAccessError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Users & Access unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
