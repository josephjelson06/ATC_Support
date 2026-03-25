import type { BackendRole, BackendSupportLevel, TicketPriority, TicketStatus } from './types';

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
};

export const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
};

export const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const target = new Date(value).getTime();
  const diffMs = target - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < hour) {
    return relativeTimeFormatter.format(Math.round(diffMs / minute), 'minute');
  }

  if (absMs < day) {
    return relativeTimeFormatter.format(Math.round(diffMs / hour), 'hour');
  }

  return relativeTimeFormatter.format(Math.round(diffMs / day), 'day');
};

export const formatBytes = (value?: number | null) => {
  if (!value || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
};

export const humanizeEnum = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const formatSupportLevelLabel = (supportLevel?: BackendSupportLevel | null) => {
  switch (supportLevel) {
    case 'SE1':
      return 'Support Engineer 1';
    case 'SE2':
      return 'Support Engineer 2';
    case 'SE3':
      return 'Support Engineer 3';
    default:
      return 'Support Engineer';
  }
};

export const formatRoleLabel = (role?: BackendRole | null, supportLevel?: BackendSupportLevel | null) => {
  switch (role) {
    case 'PM':
      return 'Project Manager';
    case 'SE':
      return formatSupportLevelLabel(supportLevel);
    default:
      return 'Internal User';
  }
};

export const getRoleDesignation = (role?: BackendRole | null, supportLevel?: BackendSupportLevel | null) =>
  formatRoleLabel(role, supportLevel);

export const getTicketPriorityClasses = (priority?: TicketPriority | null) => {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-700';
    case 'HIGH':
      return 'bg-orange-100 text-orange-700';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-700';
    case 'LOW':
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const getTicketStatusClasses = (status?: TicketStatus | null) => {
  switch (status) {
    case 'RESOLVED':
      return 'bg-green-100 text-green-700';
    case 'WAITING_ON_CUSTOMER':
      return 'bg-amber-100 text-amber-700';
    case 'ESCALATED':
      return 'bg-purple-100 text-purple-700';
    case 'REOPENED':
      return 'bg-rose-100 text-rose-700';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700';
    case 'ASSIGNED':
      return 'bg-orange-100 text-orange-700';
    case 'NEW':
    default:
      return 'bg-slate-100 text-slate-700';
  }
};
