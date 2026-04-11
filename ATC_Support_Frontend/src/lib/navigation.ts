import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  Briefcase,
  Cpu,
  LayoutDashboard,
  Ticket,
  Users,
} from 'lucide-react';

import type { BackendRole } from './types';

export type NavGroupId = 'operations' | 'insights' | 'administration';

export type TicketListView = 'queue' | 'mine' | 'escalated' | 'waiting' | 'resolved';
export type TicketDetailTab = 'summary' | 'conversation' | 'attachments' | 'email' | 'history';
export type ClientDetailTab = 'overview' | 'projects' | 'contacts' | 'consignees' | 'amcs' | 'hardware';
export type ProjectDetailTab = 'overview' | 'faqs' | 'docs';
export type ReportsTab = 'overview' | 'tickets';
export type AdminPrimaryTab = 'users';
export type UsersAccessTab = 'users' | 'roles' | 'permissions';

export interface SidebarNavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  roles: BackendRole[];
  matchPrefixes?: string[];
}

export interface SidebarNavGroup {
  id: NavGroupId;
  label: string;
  items: SidebarNavItem[];
}

export interface SectionTab {
  label: string;
  to: string;
  roles?: BackendRole[];
}

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export const appPaths = {
  dashboard: '/agent/dashboard',
  tickets: {
    queue: '/agent/tickets/queue',
    mine: '/agent/tickets/mine',
    escalated: '/agent/tickets/escalated',
    waiting: '/agent/tickets/waiting',
    resolved: '/agent/tickets/resolved',
    sessions: '/agent/tickets/sessions',
    detail: (id: number | string, tab: TicketDetailTab = 'summary') => `/agent/tickets/${id}/${tab}`,
  },
  clients: {
    list: '/agent/clients',
    detail: (id: number | string, tab: ClientDetailTab = 'overview') => `/agent/clients/${id}/${tab}`,
  },
  projects: {
    list: '/agent/projects',
    detail: (id: number | string, tab: ProjectDetailTab = 'overview') => `/agent/projects/${id}/${tab}`,
  },
  hardware: {
    list: '/agent/hardware',
  },
  reports: {
    overview: '/agent/reports/overview',
    tickets: '/agent/reports/tickets',
  },
  admin: {
    usersAccess: '/agent/admin/users-access',
    users: '/agent/admin/users',
    roles: '/agent/admin/roles',
    permissions: '/agent/admin/permissions',
  },
  account: '/agent/account',
} as const;

export const sidebarGroups: SidebarNavGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        to: appPaths.dashboard,
        icon: LayoutDashboard,
        roles: ['PM', 'SE'],
      },
      {
        id: 'tickets',
        label: 'Tickets',
        to: appPaths.tickets.queue,
        icon: Ticket,
        roles: ['PM', 'SE'],
        matchPrefixes: ['/agent/tickets', '/agent/queue', '/agent/ticket'],
      },
      {
        id: 'clients',
        label: 'Clients',
        to: appPaths.clients.list,
        icon: Users,
        roles: ['PM', 'SE'],
      },
      {
        id: 'projects',
        label: 'Projects',
        to: appPaths.projects.list,
        icon: Briefcase,
        roles: ['PM', 'SE'],
      },
      {
        id: 'hardware',
        label: 'Hardware',
        to: appPaths.hardware.list,
        icon: Cpu,
        roles: ['PM', 'SE'],
        matchPrefixes: ['/agent/hardware'],
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        to: appPaths.reports.overview,
        icon: BarChart2,
        roles: ['PM', 'SE'],
        matchPrefixes: ['/agent/reports'],
      },
    ],
  },
];

export const ticketModuleTabs: SectionTab[] = [
  { label: 'Queue', to: appPaths.tickets.queue },
  { label: 'Support Sessions', to: appPaths.tickets.sessions },
  { label: 'My Tickets', to: appPaths.tickets.mine },
  { label: 'Escalated', to: appPaths.tickets.escalated },
  { label: 'Waiting', to: appPaths.tickets.waiting },
  { label: 'Resolved', to: appPaths.tickets.resolved },
];

export const reportTabs: SectionTab[] = [
  { label: 'Overview', to: appPaths.reports.overview },
];

export const adminPrimaryTabs: SectionTab[] = [
  { label: 'Users & Access', to: appPaths.admin.users },
];

export const userAccessTabs: SectionTab[] = [
  { label: 'Users', to: appPaths.admin.users },
  { label: 'Roles', to: appPaths.admin.roles },
  { label: 'Permission Matrix', to: appPaths.admin.permissions },
];

export const getVisibleSidebarGroups = (role: BackendRole | null) => {
  if (!role) {
    return [];
  }

  return sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
};
