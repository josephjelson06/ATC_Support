export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export const DEFAULT_WIDGET_KEY = import.meta.env.VITE_WIDGET_KEY || 'widget_warehouse_portal';

export const storageKeys = {
  demoRole: 'atc-demo-role',
  authToken: 'atc-auth-token',
  dismissedDrafts: 'atc-dismissed-drafts',
  workspaceSettings: 'atc-workspace-settings',
  widgetSession: 'atc-widget-session',
} as const;
