import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  BookOpen,
  Briefcase,
  FileCode2,
  LayoutDashboard,
  LineChart,
  Settings,
  Shield,
  Ticket,
  Users,
} from 'lucide-react';

import type { BackendRole } from './types';

export type NavGroupId = 'operations' | 'insights' | 'administration';

export type TicketListView = 'queue' | 'mine' | 'escalated' | 'waiting' | 'resolved';
export type TicketDetailTab = 'summary' | 'conversation' | 'attachments' | 'email' | 'history';
export type ClientDetailTab = 'overview' | 'projects' | 'contacts' | 'consignees' | 'amcs' | 'tickets';
export type ProjectDetailTab = 'overview' | 'tickets' | 'faqs' | 'docs' | 'widget' | 'julia' | 'client' | 'amc';
export type KnowledgeBaseTab = 'library' | 'review' | 'auto-drafts';
export type ReportsTab = 'overview' | 'tickets';
export type AnalyticsTab = 'overview' | 'tickets' | 'kb' | 'performance';
export type AdminPrimaryTab = 'users' | 'masters' | 'settings';
export type UsersAccessTab = 'users' | 'roles' | 'permissions';
export type SettingsTab = 'general' | 'notifications' | 'email' | 'widget' | 'julia' | 'security' | 'integrations';

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
  kb: {
    library: '/agent/kb/library',
    review: '/agent/kb/review',
    autoDrafts: '/agent/kb/auto-drafts',
    new: '/agent/kb/new',
    edit: (id: number | string) => `/agent/kb/${id}/edit`,
    autoDraft: (id: number | string) => `/agent/kb/auto-draft/${id}`,
  },
  reports: {
    overview: '/agent/reports/overview',
    tickets: '/agent/reports/tickets',
  },
  analytics: {
    overview: '/agent/analytics/overview',
    tickets: '/agent/analytics/tickets',
    kb: '/agent/analytics/kb',
    performance: '/agent/analytics/performance',
  },
  admin: {
    users: '/agent/admin/users',
    roles: '/agent/admin/roles',
    permissions: '/agent/admin/permissions',
    masters: {
      serviceCodes: '/agent/admin/masters/service-codes',
    },
    settings: {
      general: '/agent/admin/settings/general',
      notifications: '/agent/admin/settings/notifications',
      email: '/agent/admin/settings/email',
      widget: '/agent/admin/settings/widget',
      julia: '/agent/admin/settings/julia',
      security: '/agent/admin/settings/security',
      integrations: '/agent/admin/settings/integrations',
    },
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
        roles: ['PM', 'PL', 'SE'],
      },
      {
        id: 'tickets',
        label: 'Tickets',
        to: appPaths.tickets.queue,
        icon: Ticket,
        roles: ['PM', 'PL', 'SE'],
        matchPrefixes: ['/agent/tickets', '/agent/queue', '/agent/ticket'],
      },
      {
        id: 'clients',
        label: 'Clients',
        to: appPaths.clients.list,
        icon: Users,
        roles: ['PM', 'PL'],
      },
      {
        id: 'projects',
        label: 'Projects',
        to: appPaths.projects.list,
        icon: Briefcase,
        roles: ['PM', 'PL', 'SE'],
      },
      {
        id: 'kb',
        label: 'Knowledge Base',
        to: appPaths.kb.library,
        icon: BookOpen,
        roles: ['PM', 'PL', 'SE'],
        matchPrefixes: ['/agent/kb'],
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
        roles: ['PM', 'PL'],
        matchPrefixes: ['/agent/reports'],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        to: appPaths.analytics.overview,
        icon: LineChart,
        roles: ['PM', 'PL'],
        matchPrefixes: ['/agent/analytics'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'users-access',
        label: 'Users & Access',
        to: appPaths.admin.users,
        icon: Shield,
        roles: ['PM'],
        matchPrefixes: ['/agent/admin/users', '/agent/admin/roles', '/agent/admin/permissions'],
      },
      {
        id: 'masters',
        label: 'Masters',
        to: appPaths.admin.masters.serviceCodes,
        icon: FileCode2,
        roles: ['PM'],
        matchPrefixes: ['/agent/admin/masters'],
      },
      {
        id: 'settings',
        label: 'Settings',
        to: appPaths.admin.settings.general,
        icon: Settings,
        roles: ['PM'],
        matchPrefixes: ['/agent/admin/settings'],
      },
    ],
  },
];

export const ticketModuleTabs: SectionTab[] = [
  { label: 'Queue', to: appPaths.tickets.queue },
  { label: 'My Tickets', to: appPaths.tickets.mine },
  { label: 'Escalated', to: appPaths.tickets.escalated },
  { label: 'Waiting', to: appPaths.tickets.waiting },
  { label: 'Resolved', to: appPaths.tickets.resolved },
];

export const knowledgeBaseTabs: SectionTab[] = [
  { label: 'Library', to: appPaths.kb.library },
  { label: 'Review Queue', to: appPaths.kb.review },
  { label: 'Auto Drafts', to: appPaths.kb.autoDrafts },
];

export const reportTabs: SectionTab[] = [
  { label: 'Overview', to: appPaths.reports.overview },
  { label: 'Ticket Reports', to: appPaths.reports.tickets },
];

export const analyticsTabs: SectionTab[] = [
  { label: 'Overview', to: appPaths.analytics.overview },
  { label: 'Tickets', to: appPaths.analytics.tickets },
  { label: 'Knowledge Base', to: appPaths.analytics.kb },
  { label: 'Performance', to: appPaths.analytics.performance },
];

export const adminPrimaryTabs: SectionTab[] = [
  { label: 'Users & Access', to: appPaths.admin.users },
  { label: 'Masters', to: appPaths.admin.masters.serviceCodes },
  { label: 'Settings', to: appPaths.admin.settings.general },
];

export const userAccessTabs: SectionTab[] = [
  { label: 'Users', to: appPaths.admin.users },
  { label: 'Roles', to: appPaths.admin.roles },
  { label: 'Permission Matrix', to: appPaths.admin.permissions },
];

export const settingsTabs: SectionTab[] = [
  { label: 'General', to: appPaths.admin.settings.general },
  { label: 'Notifications', to: appPaths.admin.settings.notifications },
  { label: 'Email', to: appPaths.admin.settings.email },
  { label: 'Widget Defaults', to: appPaths.admin.settings.widget },
  { label: 'Julia Defaults', to: appPaths.admin.settings.julia },
  { label: 'Security', to: appPaths.admin.settings.security },
  { label: 'Integrations', to: appPaths.admin.settings.integrations },
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
