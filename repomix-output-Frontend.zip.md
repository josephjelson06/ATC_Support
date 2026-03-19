This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
Frontend/
  src/
    components/
      entities/
        ClientCrudPanel.tsx
        ProjectCrudPanel.tsx
      layout/
        Sidebar.tsx
        Topbar.tsx
      widget/
        ChatWidget.tsx
    contexts/
      ModalContext.tsx
      RoleContext.tsx
      ToastContext.tsx
    hooks/
      useAsyncData.ts
    layouts/
      AgentLayout.tsx
      ClientLayout.tsx
    lib/
      analytics.ts
      api.ts
      config.ts
      drafts.ts
      format.ts
      types.ts
    pages/
      agent/
        dashboards/
          DirectorDashboard.tsx
          ProjectLeadDashboard.tsx
          ProjectManagerDashboard.tsx
          SupportEngineerDashboard.tsx
        ClientDetail.tsx
        ClientMasterList.tsx
        Dashboard.tsx
        InboundQueue.tsx
        ProjectDetail.tsx
        ProjectMasterList.tsx
        Reports.tsx
        TicketDetail.tsx
        TicketReport.tsx
      analytics/
        AnalyticsOverview.tsx
        EngineerPerformance.tsx
        KBAnalytics.tsx
        TicketAnalytics.tsx
      client/
        ClientDashboard.tsx
        ClientLanding.tsx
        FallbackTicketForm.tsx
      kb/
        AutoDraftDetail.tsx
        ReviewQueue.tsx
        RunbookEditor.tsx
        RunbookLibrary.tsx
      settings/
        GeneralSettings.tsx
        Integrations.tsx
        SecuritySettings.tsx
        ServiceCodesSettings.tsx
        SettingsLayout.tsx
        UserManagement.tsx
    App.tsx
    index.css
    main.tsx
    vite-env.d.ts
  .env.example
  .gitignore
  backend_spec_v2.md
  implementation_plan.md
  index.html
  metadata.json
  package.json
  README.md
  task.md
  tsconfig.json
  vite.config.ts
```

# Files

## File: Frontend/src/components/entities/ClientCrudPanel.tsx
````typescript
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiClient, ClientStatus } from '../../lib/types';

type ClientCrudPanelProps = {
  mode: 'create' | 'edit';
  client?: Pick<ApiClient, 'id' | 'name' | 'industry' | 'status'>;
  onCompleted?: (client: ApiClient, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (clientId: number) => void | Promise<void>;
};

type FormState = {
  name: string;
  industry: string;
  status: ClientStatus;
};

export function ClientCrudPanel({ mode, client, onCompleted, onDeleted }: ClientCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    name: client?.name || '',
    industry: client?.industry || '',
    status: client?.status || 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) {
      setError('Client name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        status: form.status,
      };

      const savedClient =
        mode === 'create'
          ? await apiFetch<ApiClient>('/clients', { method: 'POST', body: payload })
          : await apiFetch<ApiClient>(`/clients/${client?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(savedClient, mode);
      showToast('success', mode === 'create' ? 'Client created successfully.' : 'Client updated successfully.');
      closeModal();
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.id || mode !== 'edit') {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${client.name}? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/clients/${client.id}`, { method: 'DELETE' });
      await onDeleted?.(client.id);
      showToast('success', 'Client deleted successfully.');
      closeModal();
    } catch (deleteError) {
      const message = getErrorMessage(deleteError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Client Name">
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Acme Logistics"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Industry">
        <input
          type="text"
          value={form.industry}
          onChange={handleChange('industry')}
          placeholder="Logistics"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Status">
        <select
          value={form.status}
          onChange={handleChange('status')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </Field>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting…' : 'Delete Client'}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create Client' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}
````

## File: Frontend/src/components/entities/ProjectCrudPanel.tsx
````typescript
import { useMemo, useState } from 'react';
import { Info, RefreshCw, Trash2 } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatRoleLabel } from '../../lib/format';
import type { ApiClient, ApiProject, ApiUser, BackendRole, ProjectStatus } from '../../lib/types';

type ProjectCrudPanelProps = {
  mode: 'create' | 'edit';
  project?: Pick<ApiProject, 'id' | 'clientId' | 'assignedToId' | 'name' | 'description' | 'status' | 'widgetKey'>;
  onCompleted?: (project: ApiProject, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (projectId: number) => void | Promise<void>;
};

type FormState = {
  clientId: string;
  assignedToId: string;
  name: string;
  description: string;
  status: ProjectStatus;
};

export function ProjectCrudPanel({ mode, project, onCompleted, onDeleted }: ProjectCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    clientId: project?.clientId ? String(project.clientId) : '',
    assignedToId: project?.assignedToId ? String(project.assignedToId) : '',
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dependenciesQuery = useAsyncData(
    async () => {
      const [clients, users] = await Promise.all([apiFetch<ApiClient[]>('/clients'), apiFetch<ApiUser[]>('/users')]);
      return { clients, users };
    },
    [],
  );

  const projectLeads = useMemo(
    () => (dependenciesQuery.data?.users || []).filter((user) => user.role === 'PL'),
    [dependenciesQuery.data?.users],
  );

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.clientId) {
      setError('Select a client before saving this project.');
      return;
    }

    if (form.name.trim().length < 2) {
      setError('Project name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        clientId: Number(form.clientId),
        assignedToId: form.assignedToId ? Number(form.assignedToId) : null,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
      };

      const savedProject =
        mode === 'create'
          ? await apiFetch<ApiProject>('/projects', { method: 'POST', body: payload })
          : await apiFetch<ApiProject>(`/projects/${project?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(savedProject, mode);
      showToast('success', mode === 'create' ? 'Project created successfully.' : 'Project updated successfully.');
      closeModal();
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project?.id || mode !== 'edit') {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${project.name}? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/projects/${project.id}`, { method: 'DELETE' });
      await onDeleted?.(project.id);
      showToast('success', 'Project deleted successfully.');
      closeModal();
    } catch (deleteError) {
      const message = getErrorMessage(deleteError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (dependenciesQuery.isLoading) {
    return <PanelState title="Loading project options" description="Fetching clients and project leads from the backend." />;
  }

  if (dependenciesQuery.error || !dependenciesQuery.data) {
    return <PanelError message={dependenciesQuery.error || 'Unable to load clients and project leads.'} onRetry={dependenciesQuery.reload} />;
  }

  const hasClients = dependenciesQuery.data.clients.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!hasClients ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Create at least one client before creating a project.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Client">
          <select
            value={form.clientId}
            onChange={handleChange('clientId')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select a client</option>
            {dependenciesQuery.data.clients.map((client) => (
              <option key={client.id} value={String(client.id)}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project Lead">
          <select
            value={form.assignedToId}
            onChange={handleChange('assignedToId')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Unassigned</option>
            {projectLeads.map((user) => (
              <option key={user.id} value={String(user.id)}>
                {user.name} ({formatRoleLabel(user.role as BackendRole)})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Project Name">
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Warehouse Portal Support"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          rows={4}
          placeholder="Short description of the project scope and support context."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Status">
        <select
          value={form.status}
          onChange={handleChange('status')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </Field>

      {mode === 'edit' && project?.widgetKey ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div>
              <p className="font-bold">Widget key</p>
              <p className="mt-1 font-mono text-xs text-slate-600">{project.widgetKey}</p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting…' : 'Delete Project'}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!hasClients || isSaving || isDeleting}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create Project' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function PanelState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-lg font-black text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/components/layout/Sidebar.tsx
````typescript
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';

import { useRole, type Role } from '../../contexts/RoleContext';
import { formatRoleLabel } from '../../lib/format';

export default function Sidebar() {
  const location = useLocation();
  const { role, backendRole, setRole, name, designation, isLoading } = useRole();

  const getNavItems = () => {
    const baseItems = [{ name: 'Dashboard', path: '/agent/dashboard', icon: LayoutDashboard }];

    const engineerItems = [
      { name: 'My Projects', path: '/agent/projects', icon: Briefcase },
      { name: 'Tickets', path: '/agent/queue', icon: Ticket },
      { name: 'Knowledge Base', path: '/agent/kb', icon: BookOpen },
    ];

    const managerItems = [
      { name: 'Projects', path: '/agent/projects', icon: Briefcase },
      { name: 'Tickets', path: '/agent/queue', icon: Ticket },
      { name: 'Clients', path: '/agent/clients', icon: Users },
      { name: 'Knowledge Base', path: '/agent/kb', icon: BookOpen },
      { name: 'Reports', path: '/agent/reports', icon: BarChart2 },
      { name: 'Settings', path: '/agent/settings', icon: Settings },
    ];

    if (role === 'Support Engineer' || role === 'Project Lead') {
      return [...baseItems, ...engineerItems];
    }

    return [...baseItems, ...managerItems];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
          <span className="font-bold text-lg">J</span>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">Julia Support</h1>
          <p className="text-xs text-slate-500">Agent Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Demo Account</label>
          <select
            className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            disabled={isLoading}
          >
            <option value="Support Engineer">Support Engineer</option>
            <option value="Project Lead">Project Lead</option>
            <option value="Project Manager">Project Manager</option>
          </select>
        </div>

        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
              alt="User"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate">
              {designation}
              {backendRole ? ` • ${formatRoleLabel(backendRole)}` : ''}
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-600" title="Demo sessions are handled automatically">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
````

## File: Frontend/src/components/layout/Topbar.tsx
````typescript
import { Search } from 'lucide-react';

import { useRole } from '../../contexts/RoleContext';

export default function Topbar() {
  const { name, designation, user } = useRole();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{name}</span>
          <span className="text-slate-300">•</span>
          <span className="text-sm text-slate-500">{designation}</span>
          {user?.displayId && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-sm text-slate-400">{user.displayId}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tickets, clients..."
            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-orange-500/50 transition-all outline-none"
          />
        </div>
      </div>
    </header>
  );
}
````

## File: Frontend/src/components/widget/ChatWidget.tsx
````typescript
import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, X, Send, Search, ThumbsUp, ThumbsDown, CheckCircle2, FileText, Star, Copy } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { DEFAULT_WIDGET_KEY } from '../../lib/config';
import { formatDateTime } from '../../lib/format';
import type { ApiChatMessage, ApiTicket, WidgetFaq, WidgetFaqResponse, WidgetMessageResponse, WidgetStartResponse } from '../../lib/types';

type WidgetState = 'collapsed' | 'identity' | 'faq' | 'chat' | 'escalate' | 'success';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export default function ChatWidget() {
  const [state, setState] = useState<WidgetState>('collapsed');
  const [hasNotification, setHasNotification] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [projectName, setProjectName] = useState('Loading...');
  const [faqs, setFaqs] = useState<WidgetFaq[]>([]);
  const [identity, setIdentity] = useState({ name: '', email: '' });
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [ticketDisplayId, setTicketDisplayId] = useState('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const { showToast } = useToast();
  const { openModal } = useModal();

  const filteredFaqs = useMemo(
    () =>
      faqs.filter((faq) =>
        `${faq.question} ${faq.answer}`.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [faqs, searchQuery],
  );

  useEffect(() => {
    let isActive = true;

    const loadFaqs = async () => {
      try {
        const response = await apiFetch<WidgetFaqResponse>(`/widget/${DEFAULT_WIDGET_KEY}/faqs`, { auth: false });

        if (!isActive) {
          return;
        }

        setProjectName(response.project.name);
        setFaqs(response.faqs);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProjectName('Support Widget');
        showToast('error', getErrorMessage(error));
      }
    };

    void loadFaqs();

    return () => {
      isActive = false;
    };
  }, [showToast]);

  const resetWidget = () => {
    setState('collapsed');
    setSearchQuery('');
    setIsTyping(false);
    setFeedback(null);
    setRating(0);
    setHoverRating(0);
    setIdentity({ name: '', email: '' });
    setSessionId(null);
    setChatInput('');
    setMessages([]);
    setIssueTitle('');
    setIssueDescription('');
    setPriority('MEDIUM');
    setTicketDisplayId('');
  };

  const toggleWidget = () => {
    if (state === 'collapsed') {
      setState(sessionId ? 'chat' : 'identity');
      setHasNotification(false);
      return;
    }

    if (state === 'chat' || state === 'escalate') {
      openModal({
        title: 'Close Chat?',
        content: <p className="text-sm text-gray-600">Are you sure? Your current widget session will be closed.</p>,
        primaryAction: {
          label: 'Yes, Close',
          variant: 'danger',
          onClick: () => resetWidget(),
        },
        secondaryAction: {
          label: 'Stay',
          onClick: () => {},
        },
      });

      return;
    }

    setState('collapsed');
  };

  const handleIdentitySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsStartingSession(true);

    try {
      const response = await apiFetch<WidgetStartResponse>(`/widget/${DEFAULT_WIDGET_KEY}/chat/start`, {
        method: 'POST',
        auth: false,
        body: identity,
      });

      setSessionId(response.sessionId);
      setState('faq');
      showToast('success', 'Chat session started.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !chatInput.trim()) {
      return;
    }

    const nextUserMessage: ApiChatMessage = {
      id: Date.now(),
      role: 'USER',
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, nextUserMessage]);
    setChatInput('');
    setIsTyping(true);
    setIsSendingMessage(true);

    try {
      const response = await apiFetch<WidgetMessageResponse>(`/widget/${DEFAULT_WIDGET_KEY}/chat/message`, {
        method: 'POST',
        auth: false,
        body: {
          sessionId,
          message: nextUserMessage.content,
        },
      });

      setMessages((current) => [...current, response.message]);
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== nextUserMessage.id));
      setChatInput(nextUserMessage.content);
      showToast('error', getErrorMessage(error));
    } finally {
      setIsTyping(false);
      setIsSendingMessage(false);
    }
  };

  const handleEscalate = async () => {
    if (!identity.name || !identity.email || !issueTitle.trim()) {
      showToast('error', 'Please complete the escalation details.');
      return;
    }

    setIsSubmittingTicket(true);

    try {
      const response = await apiFetch<ApiTicket>(`/widget/${DEFAULT_WIDGET_KEY}/escalate`, {
        method: 'POST',
        auth: false,
        body: {
          sessionId: sessionId ?? undefined,
          name: identity.name,
          email: identity.email,
          title: issueTitle.trim(),
          description: issueDescription.trim() || undefined,
          priority,
        },
      });

      setTicketDisplayId(response.displayId);
      setState('success');
      showToast('success', 'Ticket submitted successfully.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const copyTicketId = async () => {
    if (!ticketDisplayId) {
      return;
    }

    await navigator.clipboard.writeText(ticketDisplayId);
    showToast('info', 'Ticket ID copied to clipboard');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {state !== 'collapsed' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-[380px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4"
          >
            <header className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center font-bold text-sm">J</div>
                <div>
                  <h1 className="text-sm font-semibold leading-tight">{projectName}</h1>
                  <p className="text-xs text-slate-400">Julia Support Assistant</p>
                </div>
              </div>
              <button onClick={toggleWidget} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden">
              {state === 'identity' && (
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome!</h2>
                    <p className="text-sm text-slate-600">Tell us who you are so Julia can start a support session for this project.</p>
                  </div>
                  <form className="space-y-4" onSubmit={(event) => void handleIdentitySubmit(event)}>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={identity.name}
                        onChange={(event) => setIdentity((current) => ({ ...current, name: event.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        placeholder="Alex Johnson"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Email</label>
                      <input
                        type="email"
                        required
                        value={identity.email}
                        onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        placeholder="alex@company.com"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isStartingSession}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 shadow-sm"
                    >
                      {isStartingSession ? 'Starting…' : 'Continue'}
                    </button>
                  </form>
                  <div className="mt-auto pt-6 text-center">
                    <Link to="/submit-ticket" onClick={() => setState('collapsed')} className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                      Skip — Submit a Ticket Directly
                    </Link>
                  </div>
                </div>
              )}

              {state === 'faq' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search for help..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Project FAQs</p>
                    {filteredFaqs.map((faq) => (
                      <div key={faq.id} className="p-3 border border-slate-100 rounded-xl hover:border-orange-500 transition-all flex gap-3">
                        <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">{faq.question}</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{faq.answer}</p>
                        </div>
                      </div>
                    ))}
                    {filteredFaqs.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-500">No FAQs matched your search.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button onClick={() => setState('chat')} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                      My issue isn't listed — Ask Julia
                    </button>
                  </div>
                </div>
              )}

              {state === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                  <div className="p-2 bg-white border-b border-slate-100 flex justify-center">
                    <button onClick={() => setState('escalate')} className="text-xs font-medium px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-orange-600 border border-orange-200 rounded-lg transition-colors">
                      Escalate to Support
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && !isTyping && (
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none text-sm max-w-[85%] shadow-sm">
                        Ask Julia anything about this project’s support FAQs, docs, or runbooks.
                      </div>
                    )}

                    {messages.map((message) => (
                      <div key={message.id} className={clsx('flex flex-col', message.role === 'USER' ? 'items-end' : 'items-start')}>
                        <div
                          className={clsx(
                            'p-3 rounded-2xl text-sm max-w-[85%] shadow-sm',
                            message.role === 'USER'
                              ? 'bg-orange-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none',
                          )}
                        >
                          <p>{message.content}</p>
                          {message.role === 'JULIA' && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                Julia AI
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setFeedback('up');
                                    showToast('success', 'Thanks for your feedback!');
                                  }}
                                  className={clsx('p-1 transition-colors', feedback === 'up' ? 'text-green-500' : 'text-slate-400 hover:text-green-500')}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setFeedback('down');
                                    showToast('info', 'Feedback recorded.');
                                  }}
                                  className={clsx('p-1 transition-colors', feedback === 'down' ? 'text-red-500' : 'text-slate-400 hover:text-red-500')}
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">{formatDateTime(message.createdAt)}</span>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex items-center gap-1 bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none w-16 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white border-t border-slate-100">
                    <div className="relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        placeholder="Type your message..."
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                      <button
                        onClick={() => void handleSendMessage()}
                        disabled={!chatInput.trim() || isSendingMessage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-600 p-1.5 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {state === 'escalate' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Project</p>
                      <p className="font-medium">{projectName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Issue Title</label>
                      <input
                        type="text"
                        value={issueTitle}
                        onChange={(event) => setIssueTitle(event.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                      <textarea
                        rows={4}
                        value={issueDescription}
                        onChange={(event) => setIssueDescription(event.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setPriority(option)}
                            className={clsx(
                              'py-2 text-sm font-medium rounded-lg border transition-colors',
                              priority === option ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-white space-y-2">
                    <button
                      onClick={() => void handleEscalate()}
                      disabled={isSubmittingTicket}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm shadow-sm"
                    >
                      {isSubmittingTicket ? 'Submitting…' : 'Submit Ticket'}
                    </button>
                    <button onClick={() => setState('chat')} className="w-full bg-transparent text-slate-500 hover:text-slate-700 font-medium py-2 text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {state === 'success' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Ticket Submitted!</h2>
                  <div className="text-sm text-slate-600 mb-8 flex flex-col items-center gap-2">
                    <p>Ticket created successfully. You'll receive email updates.</p>
                    {ticketDisplayId && (
                      <button
                        onClick={() => void copyTicketId()}
                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-mono font-semibold text-orange-600 transition-colors"
                      >
                        {ticketDisplayId}
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                    <p className="text-xs font-semibold text-slate-700 mb-3">Rate this session</p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(value)}
                          className="p-1 transition-transform active:scale-90"
                        >
                          <Star
                            className={clsx(
                              'w-6 h-6 transition-colors',
                              (hoverRating || rating) >= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={resetWidget} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group flex items-center gap-3">
        <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg pointer-events-none whitespace-nowrap">
          Julia Support
        </div>
        <button
          onClick={toggleWidget}
          className="w-14 h-14 bg-orange-600 rounded-full shadow-xl flex items-center justify-center hover:bg-orange-700 transition-all active:scale-95 relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {state === 'collapsed' ? (
              <motion.div key="chat" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <MessageSquare className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          {state === 'collapsed' && hasNotification && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/contexts/ModalContext.tsx
````typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalOptions {
  title: string;
  content: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    variant?: 'primary' | 'danger';
    disabled?: boolean;
    disabledUntil?: number; // seconds
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  closeOnOutsideClick?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

interface ModalContextType {
  openModal: (options: ModalOptions) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const openModal = useCallback((options: ModalOptions) => {
    setModal(options);
    setIsClosing(false);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setModal(null);
      setIsClosing(false);
      document.body.style.overflow = 'unset';
    }, 200);
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={modal.closeOnOutsideClick !== false ? closeModal : undefined}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full ${
                modal.size === 'sm' ? 'max-w-md' :
                modal.size === 'lg' ? 'max-w-2xl' :
                modal.size === 'xl' ? 'max-w-4xl' :
                'max-w-lg'
              }`}
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{modal.title}</h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                {modal.content}
              </div>

              {(modal.primaryAction || modal.secondaryAction) && (
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
                  {modal.secondaryAction && (
                    <button
                      onClick={() => {
                        modal.secondaryAction?.onClick();
                        closeModal();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {modal.secondaryAction.label}
                    </button>
                  )}
                  {modal.primaryAction && (
                    <PrimaryActionButton 
                      action={modal.primaryAction} 
                      closeModal={closeModal} 
                    />
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

function PrimaryActionButton({ action, closeModal }: { action: any, closeModal: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(action.disabledUntil || 0);

  React.useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t: number) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleClick = async () => {
    if (isLoading || timeLeft > 0) return;
    setIsLoading(true);
    try {
      await action.onClick();
      closeModal();
    } catch (error) {
      console.error('Modal action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = action.disabled || timeLeft > 0 || isLoading;

  return (
    <button
      disabled={isDisabled}
      onClick={handleClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
        action.variant === 'danger'
          ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
          : 'bg-orange-600 text-white hover:bg-orange-700 disabled:bg-orange-300'
      }`}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {action.label}
      {timeLeft > 0 && ` (${timeLeft}s)`}
    </button>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
````

## File: Frontend/src/contexts/RoleContext.tsx
````typescript
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, getErrorMessage, setStoredToken } from '../lib/api';
import { storageKeys } from '../lib/config';
import { formatRoleLabel, getRoleDesignation } from '../lib/format';
import type { AuthMeResponse, AuthResponse, ApiUser, BackendRole } from '../lib/types';

export type Role = 'Support Engineer' | 'Project Lead' | 'Project Manager';

interface RoleContextType {
  role: Role;
  backendRole: BackendRole | null;
  setRole: (role: Role) => void;
  designation: string;
  name: string;
  user: ApiUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const roleCredentials: Record<Role, { email: string; password: string }> = {
  'Project Manager': { email: 'pm@atc.com', password: 'password' },
  'Project Lead': { email: 'pl1@atc.com', password: 'password' },
  'Support Engineer': { email: 'se@atc.com', password: 'password' },
};

const defaultRole: Role = 'Project Manager';

const toRoleLabel = (role: BackendRole): Role => {
  switch (role) {
    case 'PM':
      return 'Project Manager';
    case 'PL':
      return 'Project Lead';
    case 'SE':
    default:
      return 'Support Engineer';
  }
};

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem(storageKeys.demoRole) as Role) || defaultRole);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authenticateAsRole = useCallback(async (nextRole: Role) => {
    setIsLoading(true);
    setError(null);

    try {
      const credentials = roleCredentials[nextRole];
      const response = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: credentials,
      });

      setStoredToken(response.token);
      localStorage.setItem(storageKeys.demoRole, nextRole);
      setToken(response.token);
      setUser(response.user);
      setRoleState(toRoleLabel(response.user.role));
    } catch (authenticationError) {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      setError(getErrorMessage(authenticationError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch<AuthMeResponse>('/auth/me');
      setUser(response.user);
      setRoleState(toRoleLabel(response.user.role));
    } catch {
      await authenticateAsRole(role);
      return;
    } finally {
      setIsLoading(false);
    }
  }, [authenticateAsRole, role]);

  useEffect(() => {
    void authenticateAsRole(role);
  }, [authenticateAsRole]);

  const setRole = useCallback(
    (nextRole: Role) => {
      setRoleState(nextRole);
      void authenticateAsRole(nextRole);
    },
    [authenticateAsRole],
  );

  const contextValue = useMemo<RoleContextType>(
    () => ({
      role,
      backendRole: user?.role ?? null,
      setRole,
      designation: getRoleDesignation(user?.role),
      name: user?.name || formatRoleLabel(user?.role) || 'Internal User',
      user,
      token,
      isLoading,
      error,
      refreshSession,
    }),
    [error, isLoading, refreshSession, role, setRole, token, user],
  );

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);

  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }

  return context;
}
````

## File: Frontend/src/contexts/ToastContext.tsx
````typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (type !== 'error') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.slice(0, 3).map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[300px] max-w-md ${
                toast.type === 'success' ? 'bg-white border-green-100 text-green-800' :
                toast.type === 'error' ? 'bg-white border-red-100 text-red-800' :
                toast.type === 'warning' ? 'bg-white border-amber-100 text-amber-800' :
                'bg-white border-blue-100 text-blue-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
              
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-4 h-4 opacity-50" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
````

## File: Frontend/src/hooks/useAsyncData.ts
````typescript
import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '../lib/api';

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const fetcherRef = useRef(fetcher);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetcherRef.current();

        if (isActive) {
          setData(result);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(getErrorMessage(fetchError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [reloadKey, ...deps]);

  return {
    data,
    setData,
    isLoading,
    error,
    reload,
  };
}
````

## File: Frontend/src/layouts/AgentLayout.tsx
````typescript
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useRole } from '../contexts/RoleContext';

export default function AgentLayout() {
  const { isLoading, error, refreshSession } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          <h1 className="text-xl font-bold text-slate-900 mt-4">Connecting to backend</h1>
          <p className="text-sm text-slate-500 mt-2">Signing into the demo account and loading live support data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-slate-900">Backend connection failed</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <button
            onClick={() => void refreshSession()}
            className="mt-5 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
````

## File: Frontend/src/layouts/ClientLayout.tsx
````typescript
import { Outlet } from 'react-router-dom';
import ChatWidget from '../components/widget/ChatWidget';

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Outlet />
      <ChatWidget />
    </div>
  );
}
````

## File: Frontend/src/lib/analytics.ts
````typescript
import type { ApiTicket } from './types';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '365d';

export type TimeBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type CsvCell = string | number;

const dayMs = 24 * 60 * 60 * 1_000;

export const analyticsPeriodOptions: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '365d', label: 'Last 12 Months' },
];

const analyticsPeriodDays: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const getAnalyticsPeriodStart = (period: AnalyticsPeriod, now = new Date()) => {
  const next = startOfDay(now);
  next.setTime(next.getTime() - dayMs * (analyticsPeriodDays[period] - 1));
  return next;
};

export const filterItemsByPeriod = <T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  period: AnalyticsPeriod,
  now = new Date(),
) => {
  const start = getAnalyticsPeriodStart(period, now).getTime();
  const end = now.getTime();

  return items.filter((item) => {
    const timestamp = toTimestamp(getDate(item));
    return timestamp !== null && timestamp >= start && timestamp <= end;
  });
};

export const buildTimeBuckets = (period: AnalyticsPeriod, now = new Date()): TimeBucket[] => {
  const buckets: TimeBucket[] = [];

  if (period === '365d') {
    let cursor = getAnalyticsPeriodStart(period, now);

    while (cursor <= now) {
      const bucketStart = startOfDay(cursor);
      const next = new Date(bucketStart);
      next.setMonth(next.getMonth() + 1);
      const bucketEnd = new Date(Math.min(endOfDay(new Date(next.getTime() - 1)).getTime(), now.getTime()));

      buckets.push({
        key: bucketStart.toISOString(),
        label: bucketStart.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        start: bucketStart,
        end: bucketEnd,
      });

      cursor = startOfDay(next);
    }

    return buckets;
  }

  const stepDays = period === '90d' ? 7 : 1;
  let cursor = getAnalyticsPeriodStart(period, now);

  while (cursor <= now) {
    const bucketStart = startOfDay(cursor);
    const next = new Date(bucketStart);
    next.setDate(next.getDate() + stepDays);
    const bucketEnd = new Date(Math.min(endOfDay(new Date(next.getTime() - 1)).getTime(), now.getTime()));

    buckets.push({
      key: bucketStart.toISOString(),
      label: bucketStart.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      start: bucketStart,
      end: bucketEnd,
    });

    cursor = startOfDay(next);
  }

  return buckets;
};

export const countItemsInBuckets = <T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  buckets: TimeBucket[],
) =>
  buckets.map((bucket) =>
    items.reduce((count, item) => {
      const timestamp = toTimestamp(getDate(item));

      if (timestamp === null) {
        return count;
      }

      return timestamp >= bucket.start.getTime() && timestamp <= bucket.end.getTime() ? count + 1 : count;
    }, 0),
  );

export const calculateAverageResolutionHours = (tickets: ApiTicket[]) => {
  const resolvedTickets = tickets.filter((ticket) => ticket.resolvedAt);

  if (resolvedTickets.length === 0) {
    return null;
  }

  const totalMilliseconds = resolvedTickets.reduce((total, ticket) => {
    const createdAt = new Date(ticket.createdAt).getTime();
    const resolvedAt = new Date(ticket.resolvedAt as string).getTime();
    return total + (resolvedAt - createdAt);
  }, 0);

  return totalMilliseconds / resolvedTickets.length / 3_600_000;
};

export const formatAnalyticsHours = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}h`);

export const formatAnalyticsPercent = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`);

export const sumNumbers = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const downloadCsvFile = (filename: string, headers: string[], rows: CsvCell[][]) => {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

export const copyTextToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};
````

## File: Frontend/src/lib/api.ts
````typescript
import { API_BASE_URL, storageKeys } from './config';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  auth?: boolean;
  body?: BodyInit | Record<string, unknown> | undefined;
};

const isRecordBody = (value: ApiFetchOptions['body']): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !(value instanceof FormData) && !(value instanceof URLSearchParams) && !(value instanceof Blob);

export const getStoredToken = () => localStorage.getItem(storageKeys.authToken);

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(storageKeys.authToken, token);
    return;
  }

  localStorage.removeItem(storageKeys.authToken);
};

export const apiFetch = async <T>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
  const { auth = true, body, headers, ...rest } = options;
  const token = getStoredToken();
  const requestHeaders = new Headers(headers);

  if (auth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let requestBody: BodyInit | undefined;

  if (isRecordBody(body)) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  } else {
    requestBody = body;
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers: requestHeaders,
    body: requestBody,
  });

  const responseText = await response.text();
  let responseData: unknown = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof responseData === 'object' && responseData !== null && 'message' in responseData
        ? String(responseData.message)
        : 'Request failed.',
      typeof responseData === 'object' && responseData !== null && 'details' in responseData ? responseData.details : undefined,
    );
  }

  return responseData as T;
};

export const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
};
````

## File: Frontend/src/lib/config.ts
````typescript
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export const DEFAULT_WIDGET_KEY = import.meta.env.VITE_WIDGET_KEY || 'widget_warehouse_portal';

export const storageKeys = {
  demoRole: 'atc-demo-role',
  authToken: 'atc-auth-token',
  dismissedDrafts: 'atc-dismissed-drafts',
  workspaceSettings: 'atc-workspace-settings',
} as const;
````

## File: Frontend/src/lib/drafts.ts
````typescript
import { storageKeys } from './config';
import { humanizeEnum } from './format';
import type { ApiChatMessage, ApiRunbook, ApiTicket, ApiTicketMessage } from './types';

export interface DraftSuggestion {
  ticketId: number;
  ticketDisplayId: string;
  title: string;
  category: string;
  confidence: number;
  createdAt: string;
  summary: string;
  content: string;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const keywordCategories: Array<{ category: string; keywords: string[] }> = [
  { category: 'Authentication', keywords: ['login', 'password', 'auth', 'access', 'permission'] },
  { category: 'Billing', keywords: ['invoice', 'billing', 'payment', 'tax', 'reconciliation'] },
  { category: 'Infrastructure', keywords: ['database', 'server', 'worker', 'queue', 'deployment', 'cache', 'network'] },
  { category: 'Frontend', keywords: ['ui', 'screen', 'dashboard', 'browser', 'page', 'render'] },
  { category: 'Operations', keywords: ['export', 'job', 'sync', 'batch', 'report', 'processing'] },
];

const toSentence = (value: string) => {
  const nextValue = value.trim();

  if (!nextValue) {
    return '';
  }

  return /[.!?]$/.test(nextValue) ? nextValue : `${nextValue}.`;
};

const uniqueLines = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalize(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

const inferCategory = (ticket: ApiTicket) => {
  const haystack = `${ticket.title} ${ticket.description || ''} ${ticket.project?.name || ''}`.toLowerCase();

  for (const rule of keywordCategories) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return 'Operations';
};

const extractResolutionLines = (ticket: ApiTicket) => {
  const ticketMessages = (ticket.messages || [])
    .map((message: ApiTicketMessage) => message.content)
    .filter(Boolean)
    .map((message) => normalize(message))
    .filter((message) => !message.startsWith('ticket created from widget escalation'));

  const chatMessages = (ticket.chatSession?.messages || [])
    .filter((message: ApiChatMessage) => message.role === 'USER')
    .map((message) => message.content)
    .filter(Boolean)
    .map((message) => normalize(message));

  const lines = uniqueLines([...ticketMessages, ...chatMessages]).slice(0, 4);

  if (lines.length > 0) {
    return lines.map((line) => toSentence(line.charAt(0).toUpperCase() + line.slice(1)));
  }

  if (ticket.description) {
    return [
      toSentence(`Review the reported issue: ${ticket.description}`),
      'Validate the affected workflow in the project environment.',
      'Apply the fix and confirm the user can complete the original task.',
    ];
  }

  return [
    'Review the reported issue and reproduce it in the relevant project workflow.',
    'Apply the corrective change or operational fix that resolves the failure.',
    'Confirm the workflow is stable before closing the ticket.',
  ];
};

const buildSymptoms = (ticket: ApiTicket) => {
  const chatSymptoms = (ticket.chatSession?.messages || [])
    .filter((message: ApiChatMessage) => message.role === 'USER')
    .map((message) => toSentence(message.content))
    .slice(0, 2);

  return uniqueLines([
    toSentence(ticket.title),
    ticket.description ? toSentence(ticket.description) : '',
    ...chatSymptoms,
  ]).slice(0, 3);
};

export const createDraftSuggestion = (ticket: ApiTicket): DraftSuggestion => {
  const category = inferCategory(ticket);
  const resolutionLines = extractResolutionLines(ticket);
  const symptoms = buildSymptoms(ticket);
  const projectLabel = ticket.project?.name || 'project workflow';
  const clientLabel = ticket.project?.client?.name || 'the client environment';
  const confidence = Math.min(
    98,
    72 +
      (ticket.description ? 6 : 0) +
      Math.min(12, (ticket.messages?.length || 0) * 4) +
      Math.min(8, (ticket.chatSession?.messages?.length || 0) * 2) +
      (ticket.assignedTo ? 4 : 0) +
      (ticket.resolvedAt ? 4 : 0),
  );

  const content = [
    '## Overview',
    toSentence(ticket.description || `Resolution guide for "${ticket.title}" in ${projectLabel}`),
    '',
    '## Source Ticket',
    `- Ticket: ${ticket.displayId}`,
    ticket.project ? `- Project: ${ticket.project.name}` : '',
    ticket.project?.client ? `- Client: ${ticket.project.client.name}` : '',
    ticket.assignedTo ? `- Resolved By: ${ticket.assignedTo.name}` : '',
    ticket.priority ? `- Priority: ${humanizeEnum(ticket.priority)}` : '',
    '',
    '## Symptoms',
    ...symptoms.map((symptom) => `- ${symptom}`),
    '',
    '## Resolution Steps',
    ...resolutionLines.map((line, index) => `${index + 1}. ${line}`),
    '',
    '## Verification',
    `- Confirm the original issue no longer reproduces in ${projectLabel}.`,
    `- Ask the user to retry the affected workflow in ${clientLabel}.`,
    '- Record any environment-specific notes before closing the ticket.',
    '',
    '## Notes',
    '- Generated from resolved ticket activity in the ATC Support workflow.',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    ticketId: ticket.id,
    ticketDisplayId: ticket.displayId,
    title: ticket.title,
    category,
    confidence,
    createdAt: ticket.resolvedAt || ticket.createdAt,
    summary: toSentence(ticket.description || ticket.title),
    content,
  };
};

export const getDismissedDraftIds = () => {
  if (typeof window === 'undefined') {
    return [] as number[];
  }

  try {
    const value = window.localStorage.getItem(storageKeys.dismissedDrafts);

    if (!value) {
      return [] as number[];
    }

    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === 'number') : [];
  } catch {
    return [] as number[];
  }
};

export const dismissDraftIds = (ids: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextIds = Array.from(new Set([...getDismissedDraftIds(), ...ids])).sort((left, right) => left - right);
  window.localStorage.setItem(storageKeys.dismissedDrafts, JSON.stringify(nextIds));
};

export const restoreDraftId = (id: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextIds = getDismissedDraftIds().filter((existingId) => existingId !== id);
  window.localStorage.setItem(storageKeys.dismissedDrafts, JSON.stringify(nextIds));
};

export const buildDraftQueue = (tickets: ApiTicket[], runbooks: ApiRunbook[]) => {
  const dismissedIds = new Set(getDismissedDraftIds());
  const existingTitles = new Set(runbooks.map((runbook) => normalize(runbook.title)));

  return tickets
    .filter((ticket) => ticket.status === 'RESOLVED')
    .map((ticket) => createDraftSuggestion(ticket))
    .filter((draft) => !dismissedIds.has(draft.ticketId))
    .filter((draft) => !existingTitles.has(normalize(draft.title)))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};
````

## File: Frontend/src/lib/format.ts
````typescript
import type { BackendRole, TicketPriority, TicketStatus } from './types';

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

export const humanizeEnum = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const formatRoleLabel = (role?: BackendRole | null) => {
  switch (role) {
    case 'PM':
      return 'Project Manager';
    case 'PL':
      return 'Project Lead';
    case 'SE':
      return 'Support Engineer';
    default:
      return 'User';
  }
};

export const getRoleDesignation = (role?: BackendRole | null) => {
  switch (role) {
    case 'PM':
      return 'Project Manager';
    case 'PL':
      return 'Project Lead';
    case 'SE':
      return 'Support Engineer';
    default:
      return 'Internal User';
  }
};

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
    case 'ESCALATED':
      return 'bg-purple-100 text-purple-700';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700';
    case 'ASSIGNED':
      return 'bg-orange-100 text-orange-700';
    case 'NEW':
    default:
      return 'bg-slate-100 text-slate-700';
  }
};
````

## File: Frontend/src/lib/types.ts
````typescript
export type BackendRole = 'PM' | 'PL' | 'SE';
export type BackendUserStatus = 'ACTIVE' | 'INACTIVE';
export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type ProjectStatus = 'ACTIVE' | 'INACTIVE';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED';
export type ChatSessionStatus = 'ACTIVE' | 'ENDED' | 'ESCALATED';
export type TicketMessageType = 'REPLY' | 'INTERNAL_NOTE' | 'SYSTEM';
export type ChatRole = 'USER' | 'JULIA';

export interface ApiUser {
  id: number;
  displayId: string;
  name: string;
  email: string;
  role: BackendRole;
  status: BackendUserStatus;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface AuthMeResponse {
  user: ApiUser;
}

export interface ApiClient {
  id: number;
  displayId: string;
  name: string;
  industry?: string | null;
  status: ClientStatus;
  createdAt: string;
  _count?: {
    contacts: number;
    consignees: number;
    projects: number;
    amcs: number;
  };
}

export interface ApiClientContact {
  id: number;
  clientId?: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
}

export interface ApiConsigneeContact {
  id: number;
  consigneeId?: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
}

export interface ApiConsignee {
  id: number;
  clientId?: number;
  name: string;
  address: string;
  contacts?: ApiConsigneeContact[];
}

export interface ApiProject {
  id: number;
  displayId: string;
  clientId?: number;
  assignedToId?: number | null;
  name: string;
  description?: string | null;
  widgetKey?: string;
  status: ProjectStatus;
  createdAt: string;
  client?: ApiClient | null;
  assignedTo?: ApiUser | null;
}

export interface ApiAmc {
  id: number;
  displayId: string;
  clientId?: number;
  projectId?: number | null;
  hoursIncluded: number;
  hoursUsed: number;
  startDate: string;
  endDate: string;
  status: string;
  project?: ApiProject | null;
}

export interface ApiClientDetail extends ApiClient {
  contacts: ApiClientContact[];
  consignees: ApiConsignee[];
  amcs: ApiAmc[];
  projects: ApiProject[];
}

export interface ApiTicketMessage {
  id: number;
  ticketId?: number;
  userId?: number | null;
  content: string;
  type?: TicketMessageType;
  createdAt: string;
  user?: ApiUser | null;
}

export interface ApiChatMessage {
  id: number;
  chatSessionId?: number;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ApiChatSession {
  id: number;
  projectId?: number;
  clientName: string;
  clientEmail: string;
  status: ChatSessionStatus;
  createdAt: string;
  endedAt?: string | null;
  project?: ApiProject | null;
  messages?: ApiChatMessage[];
}

export interface ApiTicket {
  id: number;
  displayId: string;
  projectId?: number;
  chatSessionId?: number | null;
  title: string;
  description?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToId?: number | null;
  createdAt: string;
  resolvedAt?: string | null;
  project?: ApiProject | null;
  assignedTo?: ApiUser | null;
  messages?: ApiTicketMessage[];
  chatSession?: ApiChatSession | null;
}

export interface ApiRunbook {
  id: number;
  displayId: string;
  title: string;
  content: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: ApiUser | null;
}

export interface ApiProjectDoc {
  id: number;
  projectId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: ApiUser | null;
}

export interface ApiFaq {
  id: number;
  projectId: number;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
}

export interface DashboardStats {
  role: BackendRole;
  totalClients?: number;
  totalProjects?: number;
  totalOpenTickets?: number;
  totalResolvedTickets?: number;
  totalRunbooks?: number;
  openTickets?: number;
  resolvedTickets?: number;
  totalDocs?: number;
  totalFaqs?: number;
  unassignedTickets?: number;
  myOpenTickets?: number;
  myResolvedTickets?: number;
}

export interface WidgetFaq {
  id: number;
  projectId: number;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
}

export interface WidgetFaqResponse {
  project: {
    id: number;
    name: string;
    status: string;
  };
  faqs: WidgetFaq[];
}

export interface WidgetStartResponse {
  sessionId: number;
}

export interface WidgetMessageResponse {
  sessionId: number;
  reply: string;
  message: ApiChatMessage;
}
````

## File: Frontend/src/pages/agent/dashboards/DirectorDashboard.tsx
````typescript
import { Ticket, FileText, Briefcase, Users } from 'lucide-react';

export default function DirectorDashboard() {
  const metrics = [
    { label: 'Total Active Tickets', value: '14', icon: Ticket, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Unbilled Hours', value: '124.5', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Projects', value: '8', icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Clients', value: '12', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Director Dashboard</h1>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/dashboards/ProjectLeadDashboard.tsx
````typescript
import { Link } from 'react-router-dom';
import { BookOpen, Briefcase, CheckCircle2, Ticket } from 'lucide-react';

import { useAsyncData } from '../../../hooks/useAsyncData';
import { apiFetch } from '../../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../../lib/format';
import type { ApiProject, ApiTicket, DashboardStats } from '../../../lib/types';

export default function ProjectLeadDashboard() {
  const statsQuery = useAsyncData(() => apiFetch<DashboardStats>('/dashboard/stats'), []);
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);
  const projectsQuery = useAsyncData(() => apiFetch<ApiProject[]>('/projects'), []);

  if (statsQuery.isLoading || ticketsQuery.isLoading || projectsQuery.isLoading) {
    return <DashboardSkeleton title="Project Lead Dashboard" />;
  }

  if (statsQuery.error || ticketsQuery.error || projectsQuery.error) {
    return <DashboardError message={statsQuery.error || ticketsQuery.error || projectsQuery.error || 'Unable to load dashboard.'} onRetry={() => { statsQuery.reload(); ticketsQuery.reload(); projectsQuery.reload(); }} />;
  }

  const escalatedTickets = (ticketsQuery.data || []).filter((ticket) => ticket.status === 'ESCALATED' || ticket.status === 'IN_PROGRESS').slice(0, 5);
  const projects = (projectsQuery.data || []).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Project Lead Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Open Tickets" value={String(statsQuery.data?.openTickets ?? 0)} icon={Ticket} accent="orange" />
        <StatCard label="Resolved Tickets" value={String(statsQuery.data?.resolvedTickets ?? 0)} icon={CheckCircle2} accent="green" />
        <StatCard label="Project Docs" value={String(statsQuery.data?.totalDocs ?? 0)} icon={BookOpen} accent="blue" />
        <StatCard label="Project FAQs" value={String(statsQuery.data?.totalFaqs ?? 0)} icon={Briefcase} accent="orange" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Tickets Needing My Input</h2>
            <Link to="/agent/queue" className="text-sm font-bold text-orange-600 hover:text-orange-700">
              Open Queue
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {escalatedTickets.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No escalated tickets right now.</div>
            ) : (
              escalatedTickets.map((ticket) => (
                <Link key={ticket.id} to={`/agent/ticket/${ticket.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <p className="font-bold text-slate-900">{ticket.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{ticket.displayId}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                      {humanizeEnum(ticket.priority)}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                      {humanizeEnum(ticket.status)}
                    </span>
                    <span>{ticket.project?.name}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(ticket.createdAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">My Projects</h2>
            <Link to="/agent/projects" className="text-sm font-bold text-orange-600 hover:text-orange-700">
              View Projects
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {projects.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No projects assigned.</div>
            ) : (
              projects.map((project) => (
                <Link key={project.id} to={`/agent/projects/${project.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <p className="font-bold text-slate-900">{project.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{project.displayId}</span>
                    <span>{project.client?.name || 'Unassigned client'}</span>
                    <span>•</span>
                    <span>{humanizeEnum(project.status)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Ticket;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
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

function DashboardSkeleton({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-72 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Dashboard unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/dashboards/ProjectManagerDashboard.tsx
````typescript
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, Ticket, Users } from 'lucide-react';

import { useAsyncData } from '../../../hooks/useAsyncData';
import { apiFetch } from '../../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../../lib/format';
import type { ApiClient, ApiTicket, DashboardStats } from '../../../lib/types';

export default function ProjectManagerDashboard() {
  const statsQuery = useAsyncData(() => apiFetch<DashboardStats>('/dashboard/stats'), []);
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);
  const clientsQuery = useAsyncData(() => apiFetch<ApiClient[]>('/clients'), []);

  if (statsQuery.isLoading || ticketsQuery.isLoading || clientsQuery.isLoading) {
    return <DashboardSkeleton title="Project Manager Dashboard" />;
  }

  if (statsQuery.error || ticketsQuery.error || clientsQuery.error) {
    return <DashboardError message={statsQuery.error || ticketsQuery.error || clientsQuery.error || 'Unable to load dashboard.'} onRetry={() => { statsQuery.reload(); ticketsQuery.reload(); clientsQuery.reload(); }} />;
  }

  const openTickets = (ticketsQuery.data || []).filter((ticket) => ticket.status !== 'RESOLVED').slice(0, 5);
  const activeClients = (clientsQuery.data || []).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Project Manager Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard label="Clients" value={String(statsQuery.data?.totalClients ?? 0)} icon={Users} accent="blue" />
        <StatCard label="Projects" value={String(statsQuery.data?.totalProjects ?? 0)} icon={Briefcase} accent="orange" />
        <StatCard label="Open Tickets" value={String(statsQuery.data?.totalOpenTickets ?? 0)} icon={Ticket} accent="orange" />
        <StatCard label="Resolved Tickets" value={String(statsQuery.data?.totalResolvedTickets ?? 0)} icon={CheckCircle2} accent="green" />
        <StatCard label="Runbooks" value={String(statsQuery.data?.totalRunbooks ?? 0)} icon={Briefcase} accent="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Open Ticket Queue</h2>
            <Link to="/agent/queue" className="text-sm font-bold text-orange-600 hover:text-orange-700">
              Open Queue
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {openTickets.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No open tickets right now.</div>
            ) : (
              openTickets.map((ticket) => (
                <Link key={ticket.id} to={`/agent/ticket/${ticket.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <p className="font-bold text-slate-900">{ticket.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{ticket.displayId}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                      {humanizeEnum(ticket.priority)}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                      {humanizeEnum(ticket.status)}
                    </span>
                    <span>{ticket.project?.name}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(ticket.createdAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Active Clients</h2>
            <Link to="/agent/clients" className="text-sm font-bold text-orange-600 hover:text-orange-700">
              View Clients
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {activeClients.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No clients found.</div>
            ) : (
              activeClients.map((client) => (
                <Link key={client.id} to={`/agent/clients/${client.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <p className="font-bold text-slate-900">{client.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{client.displayId}</span>
                    {client.industry && <span>{client.industry}</span>}
                    <span>{humanizeEnum(client.status)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Ticket;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
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

function DashboardSkeleton({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-72 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Dashboard unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/dashboards/SupportEngineerDashboard.tsx
````typescript
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, Ticket } from 'lucide-react';

import { useAsyncData } from '../../../hooks/useAsyncData';
import { apiFetch } from '../../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../../lib/format';
import type { ApiTicket, DashboardStats } from '../../../lib/types';
import { useRole } from '../../../contexts/RoleContext';

export default function SupportEngineerDashboard() {
  const { user } = useRole();
  const statsQuery = useAsyncData(() => apiFetch<DashboardStats>('/dashboard/stats'), []);
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);

  const assignedTickets = (ticketsQuery.data || [])
    .filter((ticket) => ticket.assignedTo?.id === user?.id && ticket.status !== 'RESOLVED')
    .slice(0, 5);
  const unassignedTickets = (ticketsQuery.data || [])
    .filter((ticket) => !ticket.assignedTo && ticket.status !== 'RESOLVED')
    .slice(0, 5);

  if (statsQuery.isLoading || ticketsQuery.isLoading) {
    return <DashboardSkeleton title="Support Engineer Dashboard" />;
  }

  if (statsQuery.error || ticketsQuery.error) {
    return <DashboardError message={statsQuery.error || ticketsQuery.error || 'Unable to load dashboard.'} onRetry={() => { statsQuery.reload(); ticketsQuery.reload(); }} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Support Engineer Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Unassigned Tickets" value={String(statsQuery.data?.unassignedTickets ?? 0)} icon={AlertTriangle} accent="orange" />
        <StatCard label="My Open Tickets" value={String(statsQuery.data?.myOpenTickets ?? 0)} icon={Ticket} accent="blue" />
        <StatCard label="My Resolved Tickets" value={String(statsQuery.data?.myResolvedTickets ?? 0)} icon={CheckCircle2} accent="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TicketListCard title="Assigned To Me" emptyText="No active assigned tickets." tickets={assignedTickets} />
        <TicketListCard title="Needs Assignment" emptyText="No unassigned tickets right now." tickets={unassignedTickets} />
      </div>
    </div>
  );
}

function TicketListCard({ title, tickets, emptyText }: { title: string; tickets: ApiTicket[]; emptyText: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <Link to="/agent/queue" className="text-sm font-bold text-orange-600 hover:text-orange-700">
          Open Queue
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {tickets.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{emptyText}</div>
        ) : (
          tickets.map((ticket) => (
            <Link key={ticket.id} to={`/agent/ticket/${ticket.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">{ticket.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{ticket.displayId}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                      {humanizeEnum(ticket.priority)}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                      {humanizeEnum(ticket.status)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock3 className="w-3 h-3" />
                  {formatRelativeTime(ticket.createdAt)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Ticket;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
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

function DashboardSkeleton({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-72 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Dashboard unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/ClientDetail.tsx
````typescript
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Briefcase, Building2, Clock3, MapPin, Pencil, ShieldCheck, Ticket, Users } from 'lucide-react';

import { ClientCrudPanel } from '../../components/entities/ClientCrudPanel';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiClientDetail, ApiTicket } from '../../lib/types';

export default function ClientDetail() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { backendRole } = useRole();
  const { id } = useParams();
  const clientQuery = useAsyncData(
    async () => {
      if (!id) {
        throw new Error('Client ID is missing.');
      }

      const client = await apiFetch<ApiClientDetail>(`/clients/${id}`);
      const tickets = await apiFetch<ApiTicket[]>('/tickets');
      const projectIds = new Set(client.projects.map((project) => project.id));
      const relatedTickets = tickets.filter((ticket) => (ticket.projectId ? projectIds.has(ticket.projectId) : false));

      return { client, tickets: relatedTickets };
    },
    [id],
  );

  if (clientQuery.isLoading) {
    return <ClientDetailSkeleton />;
  }

  if (clientQuery.error || !clientQuery.data) {
    return <ClientDetailError message={clientQuery.error || 'Unable to load client details.'} onRetry={clientQuery.reload} />;
  }

  const { client, tickets } = clientQuery.data;
  const openTickets = tickets.filter((ticket) => ticket.status !== 'RESOLVED');
  const activeAmcs = client.amcs.filter((amc) => amc.status === 'ACTIVE');
  const canManageClients = backendRole === 'PM';

  const openEditModal = () => {
    openModal({
      title: `Edit ${client.name}`,
      size: 'lg',
      content: (
        <ClientCrudPanel
          mode="edit"
          client={client}
          onCompleted={async () => {
            clientQuery.reload();
          }}
          onDeleted={async () => {
            navigate('/agent/clients');
          }}
        />
      ),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/agent/clients" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to Clients
        </Link>
      </div>

      <div className="flex flex-col items-start gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100">
          <Building2 className="h-10 w-10 text-slate-400" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{client.name}</h1>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">{client.displayId}</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                  {humanizeEnum(client.status)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {client.industry && <span>{client.industry}</span>}
                <span>•</span>
                <span>Created {formatDate(client.createdAt)}</span>
                <span>•</span>
                <span>
                  {client.projects.length} project{client.projects.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            {canManageClients ? (
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit Client
              </button>
            ) : null}
          </div>
          <p className="mt-5 text-sm text-slate-500">
            This page reads the client record, project relationships, contacts, consignees, AMCs, and related ticket activity from the backend.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <DetailStat icon={Briefcase} label="Projects" value={String(client.projects.length)} accent="orange" />
        <DetailStat icon={Users} label="Contacts" value={String(client.contacts.length)} accent="blue" />
        <DetailStat icon={Ticket} label="Open Tickets" value={String(openTickets.length)} accent="orange" />
        <DetailStat icon={ShieldCheck} label="Active AMCs" value={String(activeAmcs.length)} accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">Projects</h2>
              <span className="text-sm font-medium text-slate-500">{client.projects.length} linked</span>
            </div>
            <div className="divide-y divide-slate-100">
              {client.projects.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No projects linked to this client yet.</div>
              ) : (
                client.projects.map((project) => (
                  <Link key={project.id} to={`/agent/projects/${project.id}`} className="block p-5 transition-colors hover:bg-slate-50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{project.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-bold text-orange-600">{project.displayId}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold uppercase tracking-wider text-slate-700">
                            {humanizeEnum(project.status)}
                          </span>
                          {project.assignedTo && <span>Lead: {project.assignedTo.name}</span>}
                        </div>
                      </div>
                      {project.widgetKey ? (
                        <span className="rounded-full bg-slate-900 px-3 py-1 font-mono text-[11px] text-white">{project.widgetKey}</span>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">Recent Tickets</h2>
              <Link to="/agent/queue" className="text-sm font-bold text-orange-600 hover:text-orange-700">
                Open queue
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No tickets are currently linked to this client.</div>
              ) : (
                tickets.slice(0, 6).map((ticket) => (
                  <Link key={ticket.id} to={`/agent/ticket/${ticket.id}`} className="block p-5 transition-colors hover:bg-slate-50">
                    <p className="font-bold text-slate-900">{ticket.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-orange-600">{ticket.displayId}</span>
                      <span className={`rounded px-2 py-0.5 font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                        {humanizeEnum(ticket.priority)}
                      </span>
                      <span className={`rounded px-2 py-0.5 font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                        {humanizeEnum(ticket.status)}
                      </span>
                      <span>{ticket.project?.name}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(ticket.createdAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Client Contacts</h2>
            </div>
            <div className="space-y-4 p-5">
              {client.contacts.length === 0 ? (
                <p className="text-sm text-slate-500">No contacts added yet.</p>
              ) : (
                client.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-bold text-slate-900">{contact.name}</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      {contact.designation && <p>{contact.designation}</p>}
                      {contact.email && <p>{contact.email}</p>}
                      {contact.phone && <p>{contact.phone}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Consignees</h2>
            </div>
            <div className="space-y-4 p-5">
              {client.consignees.length === 0 ? (
                <p className="text-sm text-slate-500">No consignees added yet.</p>
              ) : (
                client.consignees.map((consignee) => (
                  <div key={consignee.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{consignee.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{consignee.address}</p>
                        {(consignee.contacts || []).length > 0 ? (
                          <p className="mt-2 text-xs text-slate-400">{(consignee.contacts || []).map((contact) => contact.name).join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">AMC Coverage</h2>
            </div>
            <div className="space-y-4 p-5">
              {client.amcs.length === 0 ? (
                <p className="text-sm text-slate-500">No AMC records linked yet.</p>
              ) : (
                client.amcs.map((amc) => {
                  const usage = amc.hoursIncluded === 0 ? 0 : Math.min(100, Math.round((amc.hoursUsed / amc.hoursIncluded) * 100));

                  return (
                    <div key={amc.id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{amc.displayId}</p>
                          <p className="mt-1 text-sm text-slate-500">{amc.project?.name || 'Unassigned AMC'}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                          {humanizeEnum(amc.status)}
                        </span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                          <span>
                            {amc.hoursUsed} / {amc.hoursIncluded} hours used
                          </span>
                          <span>{usage}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${usage}%` }} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>
                            {formatDate(amc.startDate)} to {formatDate(amc.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 w-32 rounded-xl bg-slate-200" />
      <div className="h-52 rounded-3xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-56 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function ClientDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Client unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/ClientMasterList.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, Plus, Search, ShieldCheck, Ticket } from 'lucide-react';

import { ClientCrudPanel } from '../../components/entities/ClientCrudPanel';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, humanizeEnum } from '../../lib/format';
import type { ApiClient, ApiTicket } from '../../lib/types';

export default function ClientMasterList() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { backendRole } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const clientsQuery = useAsyncData(
    async () => {
      const [clients, tickets] = await Promise.all([apiFetch<ApiClient[]>('/clients'), apiFetch<ApiTicket[]>('/tickets')]);

      return { clients, tickets };
    },
    [],
  );

  const canManageClients = backendRole === 'PM';

  const filteredClients = useMemo(() => {
    const clients = clientsQuery.data?.clients || [];

    return clients.filter((client) =>
      `${client.displayId} ${client.name} ${client.industry || ''} ${client.status}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );
  }, [clientsQuery.data?.clients, searchQuery]);

  const openCreateModal = () => {
    openModal({
      title: 'Create Client',
      size: 'lg',
      content: (
        <ClientCrudPanel
          mode="create"
          onCompleted={async (client) => {
            clientsQuery.reload();
            navigate(`/agent/clients/${client.id}`);
          }}
        />
      ),
    });
  };

  if (clientsQuery.isLoading) {
    return <ClientsSkeleton />;
  }

  if (clientsQuery.error || !clientsQuery.data) {
    return <ClientsError message={clientsQuery.error || 'Unable to load clients.'} onRetry={clientsQuery.reload} />;
  }

  const openTicketCountByClient = clientsQuery.data.tickets.reduce<Record<number, number>>((counts, ticket) => {
    const clientId = ticket.project?.client?.id;

    if (!clientId || ticket.status === 'RESOLVED') {
      return counts;
    }

    counts[clientId] = (counts[clientId] || 0) + 1;
    return counts;
  }, {});

  const totalProjects = clientsQuery.data.clients.reduce((sum, client) => sum + (client._count?.projects || 0), 0);
  const totalAmcs = clientsQuery.data.clients.reduce((sum, client) => sum + (client._count?.amcs || 0), 0);
  const totalOpenTickets = Object.values(openTicketCountByClient).reduce((sum, value) => sum + value, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">Live client data from the backend, including counts and ticket activity.</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canManageClients}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      {!canManageClients ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          You currently have read-only access here. Switch to the Project Manager role to create clients.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <SummaryCard icon={Building2} label="Clients" value={String(clientsQuery.data.clients.length)} accent="blue" />
        <SummaryCard icon={Briefcase} label="Projects" value={String(totalProjects)} accent="orange" />
        <SummaryCard icon={ShieldCheck} label="AMCs" value={String(totalAmcs)} accent="green" />
        <SummaryCard icon={Ticket} label="Open Tickets" value={String(totalOpenTickets)} accent="orange" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by client, industry, ID, or status…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Client</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Industry</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Contacts</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Projects</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">AMCs</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Open Tickets</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No clients matched that search.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link to={`/agent/clients/${client.id}`} className="group flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 transition-colors group-hover:text-orange-600">{client.name}</p>
                          <p className="font-mono text-xs text-slate-500">{client.displayId}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client.industry || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                        {humanizeEnum(client.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client._count?.contacts || 0}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client._count?.projects || 0}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client._count?.amcs || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${(openTicketCountByClient[client.id] || 0) > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                        {openTicketCountByClient[client.id] || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(client.createdAt)}</td>
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ClientsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="h-[28rem] rounded-2xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}

function ClientsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Clients unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/Dashboard.tsx
````typescript
import { useRole } from '../../contexts/RoleContext';
import SupportEngineerDashboard from './dashboards/SupportEngineerDashboard';
import ProjectLeadDashboard from './dashboards/ProjectLeadDashboard';
import ProjectManagerDashboard from './dashboards/ProjectManagerDashboard';

export default function Dashboard() {
  const { role } = useRole();

  switch (role) {
    case 'Support Engineer':
      return <SupportEngineerDashboard />;
    case 'Project Lead':
      return <ProjectLeadDashboard />;
    case 'Project Manager':
      return <ProjectManagerDashboard />;
    default:
      return <ProjectManagerDashboard />;
  }
}
````

## File: Frontend/src/pages/agent/InboundQueue.tsx
````typescript
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock3, Search, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiTicket } from '../../lib/types';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';

export default function InboundQueue() {
  const { role, user } = useRole();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return ticketsQuery.data || [];
    }

    return (ticketsQuery.data || []).filter((ticket) =>
      [ticket.displayId, ticket.title, ticket.project?.name, ticket.project?.client?.name, ticket.status, ticket.priority]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [searchQuery, ticketsQuery.data]);

  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedTicketId) || (ticketsQuery.data || []).find((ticket) => ticket.id === selectedTicketId) || null;

  const handleAssignToMe = async (ticketId: number) => {
    if (!user || role === 'Project Manager') {
      return;
    }

    setIsAssigning(true);

    try {
      await apiFetch<ApiTicket>(`/tickets/${ticketId}`, {
        method: 'PATCH',
        body: {
          assignedToId: user.id,
          status: 'ASSIGNED',
        },
      });

      showToast('success', 'Ticket assigned successfully.');
      ticketsQuery.reload();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsAssigning(false);
    }
  };

  if (ticketsQuery.isLoading) {
    return <QueueSkeleton />;
  }

  if (ticketsQuery.error) {
    return <QueueError message={ticketsQuery.error} onRetry={ticketsQuery.reload} />;
  }

  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inbound Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Live ticket queue from the ATC Support backend.</p>
          </div>
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-3 max-w-xl">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Tickets are created only through widget escalation. Manual internal ticket creation stays disabled.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Visible Tickets" value={String(ticketsQuery.data?.length ?? 0)} />
          <SummaryCard label="Unassigned" value={String((ticketsQuery.data || []).filter((ticket) => !ticket.assignedTo && ticket.status !== 'RESOLVED').length)} />
          <SummaryCard label="Resolved" value={String((ticketsQuery.data || []).filter((ticket) => ticket.status === 'RESOLVED').length)} />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by ticket, client, project, status..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Ticket', 'Client', 'Project', 'Priority', 'Status', 'Assigned To', 'Created'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No tickets match your current search.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={clsx(
                      'hover:bg-slate-50 transition-colors cursor-pointer',
                      selectedTicketId === ticket.id && 'bg-orange-50/60',
                    )}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-bold text-slate-900">{ticket.title}</p>
                        <p className="text-xs text-orange-600 font-mono mt-1">{ticket.displayId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{ticket.project?.client?.name || '—'}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{ticket.project?.name || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                        {humanizeEnum(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                        {humanizeEnum(ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{ticket.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{formatRelativeTime(ticket.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicketId(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 right-0 w-[500px] h-full bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">{selectedTicket.displayId}</span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getTicketPriorityClasses(selectedTicket.priority)}`}>
                      {humanizeEnum(selectedTicket.priority)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTicket.title}</h2>
                </div>
                <button onClick={() => setSelectedTicketId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description || 'No description provided.'}
                  </p>
                </section>

                <section className="grid grid-cols-2 gap-4">
                  <DetailStat label="Client" value={selectedTicket.project?.client?.name || '—'} />
                  <DetailStat label="Project" value={selectedTicket.project?.name || '—'} />
                  <DetailStat label="Status" value={humanizeEnum(selectedTicket.status)} />
                  <DetailStat label="Assigned To" value={selectedTicket.assignedTo?.name || 'Unassigned'} />
                </section>

                {selectedTicket.chatSessionId && <DetailStat label="Chat Session" value={`#${selectedTicket.chatSessionId}`} />}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <Link
                  to={`/agent/ticket/${selectedTicket.id}`}
                  className="flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline"
                >
                  Open full detail
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {role !== 'Project Manager' && (
                  <button
                    onClick={() => void handleAssignToMe(selectedTicket.id)}
                    disabled={isAssigning}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-60"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign to me
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm" />
        ))}
      </div>
      <div className="h-12 w-full max-w-md bg-slate-200 rounded-xl" />
      <div className="h-[480px] bg-white border border-slate-200 rounded-xl shadow-sm" />
    </div>
  );
}

function QueueError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Queue unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/ProjectDetail.tsx
````typescript
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpenText, Briefcase, FileQuestion, FileText, KeyRound, Pencil, Ticket, Users } from 'lucide-react';

import { ProjectCrudPanel } from '../../components/entities/ProjectCrudPanel';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiClientDetail, ApiFaq, ApiProject, ApiProjectDoc, ApiTicket } from '../../lib/types';

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { backendRole } = useRole();
  const { id } = useParams();
  const projectQuery = useAsyncData(
    async () => {
      if (!id) {
        throw new Error('Project ID is missing.');
      }

      const project = await apiFetch<ApiProject>(`/projects/${id}`);
      const [docs, faqs, tickets, client] = await Promise.all([
        apiFetch<ApiProjectDoc[]>(`/projects/${id}/docs`),
        apiFetch<ApiFaq[]>(`/projects/${id}/faqs`),
        apiFetch<ApiTicket[]>('/tickets'),
        project.clientId ? apiFetch<ApiClientDetail>(`/clients/${project.clientId}`) : Promise.resolve(null),
      ]);

      return {
        project,
        docs,
        faqs,
        client,
        tickets: tickets.filter((ticket) => ticket.projectId === project.id),
      };
    },
    [id],
  );

  if (projectQuery.isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (projectQuery.error || !projectQuery.data) {
    return <ProjectDetailError message={projectQuery.error || 'Unable to load project details.'} onRetry={projectQuery.reload} />;
  }

  const { project, docs, faqs, client, tickets } = projectQuery.data;
  const openTickets = tickets.filter((ticket) => ticket.status !== 'RESOLVED');
  const resolvedTickets = tickets.filter((ticket) => ticket.status === 'RESOLVED');
  const activeAmc = (client?.amcs || []).find((amc) => amc.projectId === project.id);
  const canManageProjects = backendRole === 'PM';

  const openEditModal = () => {
    openModal({
      title: `Edit ${project.name}`,
      size: 'lg',
      content: (
        <ProjectCrudPanel
          mode="edit"
          project={project}
          onCompleted={async () => {
            projectQuery.reload();
          }}
          onDeleted={async () => {
            navigate('/agent/projects');
          }}
        />
      ),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/agent/projects" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to Projects
        </Link>
      </div>

      <div className="flex flex-col items-start gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100">
          <Briefcase className="h-10 w-10 text-slate-400" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">{project.displayId}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                  {humanizeEnum(project.status)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {project.client && <span>Client: {project.client.name}</span>}
                {project.assignedTo && <span>• Lead: {project.assignedTo.name}</span>}
                <span>• Created {formatDate(project.createdAt)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {project.widgetKey ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 font-mono text-sm text-white">
                  <KeyRound className="h-4 w-4" />
                  {project.widgetKey}
                </div>
              ) : null}
              {canManageProjects ? (
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Project
                </button>
              ) : null}
            </div>
          </div>
          {project.description ? <p className="mt-5 text-sm leading-relaxed text-slate-500">{project.description}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <ProjectDetailStat icon={Ticket} label="Open Tickets" value={String(openTickets.length)} accent="orange" />
        <ProjectDetailStat icon={Users} label="Resolved Tickets" value={String(resolvedTickets.length)} accent="green" />
        <ProjectDetailStat icon={FileText} label="Docs" value={String(docs.length)} accent="blue" />
        <ProjectDetailStat icon={FileQuestion} label="FAQs" value={String(faqs.length)} accent="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">Ticket Activity</h2>
              <Link to="/agent/queue" className="text-sm font-bold text-orange-600 hover:text-orange-700">
                Open queue
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No tickets are linked to this project yet.</div>
              ) : (
                tickets.map((ticket) => (
                  <Link key={ticket.id} to={`/agent/ticket/${ticket.id}`} className="block p-5 transition-colors hover:bg-slate-50">
                    <p className="font-bold text-slate-900">{ticket.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-orange-600">{ticket.displayId}</span>
                      <span className={`rounded px-2 py-0.5 font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                        {humanizeEnum(ticket.priority)}
                      </span>
                      <span className={`rounded px-2 py-0.5 font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                        {humanizeEnum(ticket.status)}
                      </span>
                      {ticket.assignedTo && <span>{ticket.assignedTo.name}</span>}
                      <span>•</span>
                      <span>{formatRelativeTime(ticket.createdAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">Project Documentation</h2>
              <span className="text-sm text-slate-500">
                {docs.length} document{docs.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {docs.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No project docs are available yet.</div>
              ) : (
                docs.map((doc) => (
                  <div key={doc.id} className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <BookOpenText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{doc.title}</p>
                        <p className="mt-2 line-clamp-3 text-sm text-slate-500">{doc.content}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          {doc.createdBy && <span>{doc.createdBy.name}</span>}
                          <span>•</span>
                          <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">FAQs</h2>
            </div>
            <div className="space-y-4 p-5">
              {faqs.length === 0 ? (
                <p className="text-sm text-slate-500">No FAQs configured for this project.</p>
              ) : (
                faqs.map((faq) => (
                  <div key={faq.id} className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-bold text-slate-900">{faq.question}</p>
                    <p className="mt-2 text-sm text-slate-500">{faq.answer}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Client Context</h2>
            </div>
            <div className="space-y-4 p-5">
              {client ? (
                <>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-bold text-slate-900">{client.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{client.industry || 'No industry set'}</p>
                  </div>
                  <div className="space-y-3">
                    {client.contacts.map((contact) => (
                      <div key={contact.id} className="rounded-2xl border border-slate-100 p-4">
                        <p className="font-bold text-slate-900">{contact.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{contact.designation || 'Client Contact'}</p>
                        {contact.email && <p className="mt-1 text-sm text-slate-500">{contact.email}</p>}
                        {contact.phone && <p className="text-sm text-slate-500">{contact.phone}</p>}
                      </div>
                    ))}
                    {client.contacts.length === 0 ? <p className="text-sm text-slate-500">No client contacts available.</p> : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Client details are unavailable for this project.</p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">AMC Status</h2>
            </div>
            <div className="p-5">
              {activeAmc ? (
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900">{activeAmc.displayId}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {activeAmc.hoursUsed} / {activeAmc.hoursIncluded} hours used
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                      {humanizeEnum(activeAmc.status)}
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{
                        width: `${activeAmc.hoursIncluded === 0 ? 0 : Math.min(100, Math.round((activeAmc.hoursUsed / activeAmc.hoursIncluded) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    {formatDate(activeAmc.startDate)} to {formatDate(activeAmc.endDate)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No AMC is currently linked to this project.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 w-36 rounded-xl bg-slate-200" />
      <div className="h-52 rounded-3xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function ProjectDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Project unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/ProjectMasterList.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, KeyRound, Plus, Search, Ticket, UserRoundCog } from 'lucide-react';

import { ProjectCrudPanel } from '../../components/entities/ProjectCrudPanel';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiTicket } from '../../lib/types';

export default function ProjectMasterList() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { role, backendRole } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const projectsQuery = useAsyncData(
    async () => {
      const [projects, tickets] = await Promise.all([apiFetch<ApiProject[]>('/projects'), apiFetch<ApiTicket[]>('/tickets')]);

      return { projects, tickets };
    },
    [],
  );

  const canManageProjects = backendRole === 'PM';

  const filteredProjects = useMemo(() => {
    const projects = projectsQuery.data?.projects || [];

    return projects.filter((project) =>
      `${project.displayId} ${project.name} ${project.client?.name || ''} ${project.assignedTo?.name || ''} ${project.widgetKey || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );
  }, [projectsQuery.data?.projects, searchQuery]);

  const openCreateModal = () => {
    openModal({
      title: 'Create Project',
      size: 'lg',
      content: (
        <ProjectCrudPanel
          mode="create"
          onCompleted={async (project) => {
            projectsQuery.reload();
            navigate(`/agent/projects/${project.id}`);
          }}
        />
      ),
    });
  };

  if (projectsQuery.isLoading) {
    return <ProjectsSkeleton />;
  }

  if (projectsQuery.error || !projectsQuery.data) {
    return <ProjectsError message={projectsQuery.error || 'Unable to load projects.'} onRetry={projectsQuery.reload} />;
  }

  const openTicketCountByProject = projectsQuery.data.tickets.reduce<Record<number, number>>((counts, ticket) => {
    if (!ticket.projectId || ticket.status === 'RESOLVED') {
      return counts;
    }

    counts[ticket.projectId] = (counts[ticket.projectId] || 0) + 1;
    return counts;
  }, {});

  const activeProjects = projectsQuery.data.projects.filter((project) => project.status === 'ACTIVE').length;
  const totalOpenTickets = Object.values(openTicketCountByProject).reduce((sum, value) => sum + value, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{role === 'Project Manager' ? 'Projects' : 'Accessible Projects'}</h1>
          <p className="mt-1 text-sm text-slate-500">Project list is loaded from the backend with live client, lead, and ticket metadata.</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canManageProjects}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {!canManageProjects ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          You currently have read-only access here. Switch to the Project Manager role to create projects.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ProjectStat icon={Briefcase} label="Projects" value={String(projectsQuery.data.projects.length)} accent="orange" />
        <ProjectStat icon={Ticket} label="Open Tickets" value={String(totalOpenTickets)} accent="blue" />
        <ProjectStat icon={UserRoundCog} label="Active Projects" value={String(activeProjects)} accent="green" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by project, client, lead, or widget key…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Project</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Client</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Lead</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Open Tickets</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Widget Key</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No projects matched that search.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link to={`/agent/projects/${project.id}`} className="block group">
                        <p className="font-bold text-slate-900 transition-colors group-hover:text-orange-600">{project.name}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{project.displayId}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{project.client?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{project.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                        {humanizeEnum(project.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${(openTicketCountByProject[project.id] || 0) > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                        {openTicketCountByProject[project.id] || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {project.widgetKey ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 font-mono text-[11px] text-white">
                          <KeyRound className="h-3 w-3" />
                          {project.widgetKey}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(project.createdAt)}</td>
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

function ProjectStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="h-[28rem] rounded-2xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}

function ProjectsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Projects unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/Reports.tsx
````typescript
import { Link } from 'react-router-dom';
import { BarChart3, BookOpenText, FileText, Ticket } from 'lucide-react';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiRunbook, ApiTicket } from '../../lib/types';

export default function Reports() {
  const reportsQuery = useAsyncData(
    async () => {
      const [tickets, projects, runbooks] = await Promise.all([
        apiFetch<ApiTicket[]>('/tickets'),
        apiFetch<ApiProject[]>('/projects'),
        apiFetch<ApiRunbook[]>('/runbooks'),
      ]);

      return { tickets, projects, runbooks };
    },
    [],
  );

  if (reportsQuery.isLoading) {
    return <ReportsSkeleton />;
  }

  if (reportsQuery.error || !reportsQuery.data) {
    return <ReportsError message={reportsQuery.error || 'Unable to load report summaries.'} onRetry={reportsQuery.reload} />;
  }

  const openTickets = reportsQuery.data.tickets.filter((ticket) => ticket.status !== 'RESOLVED').length;
  const resolvedTickets = reportsQuery.data.tickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const activeProjects = reportsQuery.data.projects.filter((project) => project.status === 'ACTIVE').length;
  const topPriority =
    reportsQuery.data.tickets.find((ticket) => ticket.status !== 'RESOLVED')?.priority ||
    reportsQuery.data.tickets[0]?.priority ||
    null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Live summaries from the backend to help you jump into reporting workflows.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard icon={Ticket} label="Open Tickets" value={String(openTickets)} accent="orange" />
        <MetricCard icon={BarChart3} label="Resolved Tickets" value={String(resolvedTickets)} accent="green" />
        <MetricCard icon={FileText} label="Runbooks" value={String(reportsQuery.data.runbooks.length)} accent="blue" />
        <MetricCard icon={BookOpenText} label="Active Projects" value={String(activeProjects)} accent="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link
          to="/agent/reports/tickets"
          className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-orange-300 transition-all group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
              Operations
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-5 group-hover:text-orange-600 transition-colors">Ticket Report Builder</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Filter by status, project, and date range using the live `/api/reports/tickets` endpoint.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">{reportsQuery.data.tickets.length} tickets available</span>
            {topPriority && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                Highest active priority: {humanizeEnum(topPriority)}
              </span>
            )}
          </div>
        </Link>

        <Link
          to="/agent/kb"
          className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
              Knowledge Base
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-5 group-hover:text-blue-600 transition-colors">Knowledge Base Snapshot</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Jump into runbook and project document management, including draft review and deletion flows.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">{reportsQuery.data.runbooks.length} runbooks</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">{reportsQuery.data.projects.length} accessible projects</span>
          </div>
        </Link>
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
  icon: typeof Ticket;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
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

function ReportsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
}

function ReportsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Reports unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/agent/TicketDetail.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Lock, MessageSquare, Send, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatDateTime, formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiTicket, TicketMessageType, TicketStatus } from '../../lib/types';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';

export default function TicketDetail() {
  const { id } = useParams();
  const ticketId = Number(id);
  const { role, user } = useRole();
  const { showToast } = useToast();
  const { openModal } = useModal();
  const [interactionType, setInteractionType] = useState<'reply' | 'note'>('reply');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ticketQuery = useAsyncData(() => apiFetch<ApiTicket>(`/tickets/${ticketId}`), [ticketId]);

  const isReadOnly = role === 'Project Manager';
  const timeline = useMemo(
    () => (ticketQuery.data?.messages || []).slice().sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    [ticketQuery.data?.messages],
  );

  const patchTicket = async (data: Partial<ApiTicket> & { status?: TicketStatus; assignedToId?: number | null }) => {
    try {
      await apiFetch<ApiTicket>(`/tickets/${ticketId}`, {
        method: 'PATCH',
        body: data as Record<string, unknown>,
      });
      ticketQuery.reload();
    } catch (error) {
      showToast('error', getErrorMessage(error));
      throw error;
    }
  };

  const handleAssignToMe = async () => {
    if (!user || isReadOnly) {
      return;
    }

    try {
      await patchTicket({
        assignedToId: user.id,
        status: ticketQuery.data?.status === 'NEW' ? 'ASSIGNED' : ticketQuery.data?.status,
      });
      showToast('success', 'Ticket assigned successfully.');
    } catch {}
  };

  const handleResolve = () => {
    openModal({
      title: 'Resolve Ticket',
      content: <p className="text-sm text-slate-600">Mark this ticket as resolved and notify the rest of the team.</p>,
      primaryAction: {
        label: 'Resolve Ticket',
        onClick: async () => {
          await patchTicket({ status: 'RESOLVED' });
          showToast('success', 'Ticket marked as resolved.');
        },
      },
      secondaryAction: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  const handleEscalate = () => {
    openModal({
      title: 'Escalate Ticket',
      content: <p className="text-sm text-slate-600">Escalate this ticket to the project lead assigned to the project.</p>,
      primaryAction: {
        label: 'Escalate Ticket',
        onClick: async () => {
          await patchTicket({ status: 'ESCALATED' });
          showToast('warning', 'Ticket escalated to the project lead.');
        },
      },
      secondaryAction: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
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
                  onClick={handleResolve}
                  className="w-full py-2.5 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Resolved
                </button>
                {role === 'Support Engineer' && (
                  <button
                    onClick={handleEscalate}
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
````

## File: Frontend/src/pages/agent/TicketReport.tsx
````typescript
import { useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDateTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiTicket, TicketStatus } from '../../lib/types';

type Filters = {
  projectId: string;
  status: '' | TicketStatus;
  fromDate: string;
  toDate: string;
  search: string;
};

const defaultFilters: Filters = {
  projectId: '',
  status: '',
  fromDate: '',
  toDate: '',
  search: '',
};

const buildReportPath = (filters: Filters) => {
  const params = new URLSearchParams();

  if (filters.projectId) {
    params.set('projectId', filters.projectId);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.fromDate) {
    params.set('from', filters.fromDate);
  }

  if (filters.toDate) {
    params.set('to', filters.toDate);
  }

  const query = params.toString();
  return `/reports/tickets${query ? `?${query}` : ''}`;
};

const downloadCsv = (tickets: ApiTicket[]) => {
  const headers = ['Ticket ID', 'Title', 'Client', 'Project', 'Priority', 'Status', 'Assignee', 'Created At', 'Resolved At'];
  const rows = tickets.map((ticket) => [
    ticket.displayId,
    ticket.title,
    ticket.project?.client?.name || '',
    ticket.project?.name || '',
    humanizeEnum(ticket.priority),
    humanizeEnum(ticket.status),
    ticket.assignedTo?.name || '',
    formatDateTime(ticket.createdAt),
    ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ticket-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function TicketReport() {
  const { showToast } = useToast();
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);

  const projectsQuery = useAsyncData(() => apiFetch<ApiProject[]>('/projects'), []);
  const reportQuery = useAsyncData(() => apiFetch<ApiTicket[]>(buildReportPath(appliedFilters)), [appliedFilters]);

  const visibleTickets = useMemo(() => {
    const tickets = reportQuery.data || [];

    if (!draftFilters.search.trim()) {
      return tickets;
    }

    const search = draftFilters.search.toLowerCase();

    return tickets.filter((ticket) =>
      `${ticket.displayId} ${ticket.title} ${ticket.project?.name || ''} ${ticket.project?.client?.name || ''} ${ticket.assignedTo?.name || ''}`
        .toLowerCase()
        .includes(search),
    );
  }, [draftFilters.search, reportQuery.data]);

  const handleApplyFilters = () => {
    setAppliedFilters((current) => ({
      ...current,
      projectId: draftFilters.projectId,
      status: draftFilters.status,
      fromDate: draftFilters.fromDate,
      toDate: draftFilters.toDate,
    }));
  };

  const handleResetFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleExportCsv = () => {
    if (visibleTickets.length === 0) {
      showToast('warning', 'There are no report rows to export.');
      return;
    }

    downloadCsv(visibleTickets);
    showToast('success', 'Ticket report exported as CSV.');
  };

  const averageResolutionHours = (() => {
    const resolvedTickets = visibleTickets.filter((ticket) => ticket.resolvedAt);

    if (resolvedTickets.length === 0) {
      return null;
    }

    const totalMs = resolvedTickets.reduce((sum, ticket) => {
      const createdAt = new Date(ticket.createdAt).getTime();
      const resolvedAt = new Date(ticket.resolvedAt!).getTime();
      return sum + (resolvedAt - createdAt);
    }, 0);

    return (totalMs / resolvedTickets.length / 3_600_000).toFixed(1);
  })();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ticket Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Filter and export live ticket data from the backend report endpoint.</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard label="Visible Tickets" value={String(visibleTickets.length)} />
        <SummaryCard label="Resolved" value={String(visibleTickets.filter((ticket) => ticket.status === 'RESOLVED').length)} />
        <SummaryCard label="Open" value={String(visibleTickets.filter((ticket) => ticket.status !== 'RESOLVED').length)} />
        <SummaryCard label="Avg Resolution" value={averageResolutionHours ? `${averageResolutionHours}h` : '—'} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={draftFilters.search}
                onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search ticket, client, project, or assignee…"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project</label>
            <select
              value={draftFilters.projectId}
              onChange={(event) => setDraftFilters((current) => ({ ...current, projectId: event.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              <option value="">All projects</option>
              {(projectsQuery.data || []).map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
            <select
              value={draftFilters.status}
              onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as Filters['status'] }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              <option value="">All statuses</option>
              {(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'] as TicketStatus[]).map((status) => (
                <option key={status} value={status}>
                  {humanizeEnum(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">From</label>
            <input
              type="date"
              value={draftFilters.fromDate}
              onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">To</label>
            <input
              type="date"
              value={draftFilters.toDate}
              onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={reportQuery.reload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {reportQuery.isLoading ? (
        <ReportSkeleton />
      ) : reportQuery.error ? (
        <ReportError message={reportQuery.error} onRetry={reportQuery.reload} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                      No tickets matched the selected filters.
                    </td>
                  </tr>
                ) : (
                  visibleTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{ticket.title}</p>
                          <p className="text-xs text-orange-600 font-mono font-bold mt-1">{ticket.displayId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.client?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>
                          {humanizeEnum(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>
                          {humanizeEnum(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.assignedTo?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function ReportSkeleton() {
  return <div className="h-[28rem] bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse" />;
}

function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
      <h2 className="text-lg font-bold text-slate-900">Report unavailable</h2>
      <p className="text-sm text-slate-500 mt-2">{message}</p>
      <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/pages/analytics/AnalyticsOverview.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BookOpen, Copy, FolderKanban, RefreshCw, Ticket, TrendingUp, Users } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  buildTimeBuckets,
  calculateAverageResolutionHours,
  copyTextToClipboard,
  countItemsInBuckets,
  downloadCsvFile,
  filterItemsByPeriod,
  formatAnalyticsHours,
  formatAnalyticsPercent,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiRunbook, ApiTicket, ApiUser, TicketStatus } from '../../lib/types';

const ticketStatusOrder: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'];

const statusColors: Record<TicketStatus, string> = {
  NEW: '#94a3b8',
  ASSIGNED: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  ESCALATED: '#8b5cf6',
  RESOLVED: '#10b981',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      {label ? <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.color}`} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-bold text-slate-500">{entry.name}</span>
            <span className="ml-auto font-black text-slate-900">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AnalyticsOverview() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const overviewQuery = useAsyncData(
    async () => {
      const [tickets, projects, runbooks, users] = await Promise.all([
        apiFetch<ApiTicket[]>('/reports/tickets'),
        apiFetch<ApiProject[]>('/projects'),
        apiFetch<ApiRunbook[]>('/runbooks'),
        apiFetch<ApiUser[]>('/users'),
      ]);

      return { tickets, projects, runbooks, users };
    },
    [],
  );

  const tickets = overviewQuery.data?.tickets || [];
  const projects = overviewQuery.data?.projects || [];
  const runbooks = overviewQuery.data?.runbooks || [];
  const users = overviewQuery.data?.users || [];

  const filteredTickets = useMemo(() => filterItemsByPeriod(tickets, (ticket) => ticket.createdAt, period), [period, tickets]);
  const filteredRunbooks = useMemo(() => filterItemsByPeriod(runbooks, (runbook) => runbook.createdAt, period), [period, runbooks]);

  const trendData = useMemo(() => {
    const buckets = buildTimeBuckets(period);
    const openedCounts = countItemsInBuckets(filteredTickets, (ticket) => ticket.createdAt, buckets);
    const resolvedCounts = countItemsInBuckets(
      filteredTickets.filter((ticket) => ticket.resolvedAt),
      (ticket) => ticket.resolvedAt,
      buckets,
    );

    return buckets.map((bucket, index) => ({
      name: bucket.label,
      opened: openedCounts[index],
      resolved: resolvedCounts[index],
    }));
  }, [filteredTickets, period]);

  const statusData = useMemo(
    () =>
      ticketStatusOrder
        .map((status) => ({
          name: humanizeEnum(status),
          value: filteredTickets.filter((ticket) => ticket.status === status).length,
          color: statusColors[status],
        }))
        .filter((entry) => entry.value > 0),
    [filteredTickets],
  );

  const resolvedTickets = filteredTickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const resolutionRate = filteredTickets.length ? (resolvedTickets / filteredTickets.length) * 100 : null;
  const averageResolution = calculateAverageResolutionHours(filteredTickets);
  const activeContributors = users.filter((user) => user.status === 'ACTIVE' && user.role !== 'PM').length;

  const summaryText = useMemo(
    () =>
      [
        `ATC Support overview (${analyticsPeriodOptions.find((option) => option.value === period)?.label})`,
        `Tickets in range: ${filteredTickets.length}`,
        `Resolved tickets: ${resolvedTickets}`,
        `Resolution rate: ${formatAnalyticsPercent(resolutionRate)}`,
        `Average resolution time: ${formatAnalyticsHours(averageResolution)}`,
        `Projects covered: ${projects.length}`,
        `Runbooks available: ${runbooks.length} (${filteredRunbooks.length} created in range)`,
        `Active contributors: ${activeContributors}`,
      ].join('\n'),
    [activeContributors, averageResolution, filteredRunbooks.length, filteredTickets.length, period, projects.length, resolvedTickets, resolutionRate, runbooks.length],
  );

  const handleCopySummary = async () => {
    try {
      await copyTextToClipboard(summaryText);
      showToast('success', 'Analytics summary copied to the clipboard.');
    } catch {
      showToast('error', 'Unable to copy the analytics summary right now.');
    }
  };

  const handleExport = () => {
    downloadCsvFile(
      `analytics-overview-${period}.csv`,
      ['Period', 'New Tickets', 'Resolved Tickets'],
      trendData.map((row) => [row.name, row.opened, row.resolved]),
    );
    showToast('success', 'Overview trend exported as CSV.');
  };

  if (overviewQuery.isLoading) {
    return <PageState title="Loading analytics" description="Pulling live ticket, project, and runbook data from the backend." />;
  }

  if (overviewQuery.error) {
    return <ErrorState message={overviewQuery.error} onRetry={overviewQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Analytics Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Live roll-up of ticket throughput, knowledge assets, and team capacity.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            {analyticsPeriodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={overviewQuery.reload}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            Copy Summary
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            <TrendingUp className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Ticket} label="Tickets In Range" value={String(filteredTickets.length)} hint={`${resolvedTickets} resolved`} iconClasses="bg-orange-50 text-orange-600 border-orange-100" />
        <SummaryCard icon={TrendingUp} label="Resolution Rate" value={formatAnalyticsPercent(resolutionRate)} hint="Based on live ticket statuses" iconClasses="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <SummaryCard icon={FolderKanban} label="Projects Covered" value={String(projects.length)} hint={`${activeContributors} active contributors`} iconClasses="bg-blue-50 text-blue-600 border-blue-100" />
        <SummaryCard icon={BookOpen} label="Runbooks Available" value={String(runbooks.length)} hint={`${filteredRunbooks.length} created in range`} iconClasses="bg-purple-50 text-purple-600 border-purple-100" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">Ticket Trend</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Opened versus resolved over time</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Avg resolution {formatAnalyticsHours(averageResolution)}
            </span>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="opened" name="Opened" stroke="#ea580c" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Status Mix</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Current distribution in the selected range</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">No ticket activity in this period.</div>
          ) : (
            <>
              <div className="relative h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={90} paddingAngle={4} stroke="none">
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="font-bold text-slate-600">{entry.name}</span>
                    </div>
                    <span className="font-black text-slate-900">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <AnalyticsLink to="/agent/analytics/tickets" title="Ticket Analytics" description="Drill into resolution time, backlog, and priority patterns." />
        <AnalyticsLink to="/agent/analytics/kb" title="KB Analytics" description="Track runbook growth, draft opportunities, and category coverage." />
        <AnalyticsLink to="/agent/analytics/performance" title="Engineer Performance" description="Compare resolved workload and live ownership across the team." />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClasses,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
  hint: string;
  iconClasses: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function AnalyticsLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
    >
      <p className="text-xs font-black uppercase tracking-widest text-orange-600">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/pages/analytics/EngineerPerformance.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Download, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  calculateAverageResolutionHours,
  copyTextToClipboard,
  downloadCsvFile,
  filterItemsByPeriod,
  formatAnalyticsHours,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { formatDateTime, formatRoleLabel } from '../../lib/format';
import type { ApiTicket, ApiUser, BackendRole } from '../../lib/types';

const performerColors = ['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#14b8a6'];

type PerformanceRow = {
  user: ApiUser;
  resolved: number;
  open: number;
  totalAssigned: number;
  criticalOwned: number;
  averageResolutionHours: number | null;
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      {label ? <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.color}`} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-bold text-slate-500">{entry.name}</span>
            <span className="ml-auto font-black text-slate-900">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function EngineerPerformance() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [roleFilter, setRoleFilter] = useState<'ALL' | BackendRole>('ALL');

  const performanceQuery = useAsyncData(
    async () => {
      const [tickets, users] = await Promise.all([apiFetch<ApiTicket[]>('/reports/tickets'), apiFetch<ApiUser[]>('/users')]);
      return { tickets, users };
    },
    [],
  );

  const periodTickets = useMemo(() => filterItemsByPeriod(performanceQuery.data?.tickets || [], (ticket) => ticket.createdAt, period), [performanceQuery.data?.tickets, period]);
  const engineers = useMemo(() => {
    const baseUsers = (performanceQuery.data?.users || []).filter((user) => user.role !== 'PM');
    return roleFilter === 'ALL' ? baseUsers : baseUsers.filter((user) => user.role === roleFilter);
  }, [performanceQuery.data?.users, roleFilter]);

  const performanceRows = useMemo<PerformanceRow[]>(() => {
    return engineers
      .map((user) => {
        const assignedTickets = periodTickets.filter((ticket) => ticket.assignedTo?.id === user.id);
        const resolvedTickets = assignedTickets.filter((ticket) => ticket.status === 'RESOLVED');
        const openTickets = assignedTickets.filter((ticket) => ticket.status !== 'RESOLVED');

        return {
          user,
          resolved: resolvedTickets.length,
          open: openTickets.length,
          totalAssigned: assignedTickets.length,
          criticalOwned: assignedTickets.filter((ticket) => ticket.priority === 'CRITICAL').length,
          averageResolutionHours: calculateAverageResolutionHours(resolvedTickets),
        };
      })
      .sort((left, right) => right.resolved - left.resolved || right.totalAssigned - left.totalAssigned);
  }, [engineers, periodTickets]);

  const chartData = performanceRows.slice(0, 8).map((row, index) => ({
    name: row.user.name,
    resolved: row.resolved,
    open: row.open,
    fill: performerColors[index % performerColors.length],
  }));

  const activeContributors = engineers.filter((user) => user.status === 'ACTIVE').length;
  const resolvedTickets = performanceRows.reduce((total, row) => total + row.resolved, 0);
  const openTickets = performanceRows.reduce((total, row) => total + row.open, 0);
  const criticalTickets = performanceRows.reduce((total, row) => total + row.criticalOwned, 0);
  const averageResolution = calculateAverageResolutionHours(periodTickets.filter((ticket) => ticket.assignedTo));
  const averageOpenLoad = activeContributors ? (openTickets / activeContributors).toFixed(1) : '0.0';

  const summaryText = useMemo(
    () =>
      [
        `Engineer performance (${analyticsPeriodOptions.find((option) => option.value === period)?.label})`,
        `Active contributors: ${activeContributors}`,
        `Resolved tickets: ${resolvedTickets}`,
        `Open tickets: ${openTickets}`,
        `Critical tickets owned: ${criticalTickets}`,
        `Average resolution time: ${formatAnalyticsHours(averageResolution)}`,
      ].join('\n'),
    [activeContributors, averageResolution, criticalTickets, openTickets, period, resolvedTickets],
  );

  const handleCopySummary = async () => {
    try {
      await copyTextToClipboard(summaryText);
      showToast('success', 'Performance summary copied to the clipboard.');
    } catch {
      showToast('error', 'Unable to copy the performance summary right now.');
    }
  };

  const handleExport = () => {
    downloadCsvFile(
      `engineer-performance-${period}.csv`,
      ['User ID', 'Name', 'Role', 'Status', 'Resolved', 'Open', 'Critical Owned', 'Avg Resolution', 'Created At'],
      performanceRows.map((row) => [
        row.user.displayId,
        row.user.name,
        formatRoleLabel(row.user.role),
        row.user.status,
        row.resolved,
        row.open,
        row.criticalOwned,
        row.averageResolutionHours === null ? '—' : `${row.averageResolutionHours.toFixed(1)}h`,
        formatDateTime(row.user.createdAt),
      ]),
    );
    showToast('success', 'Engineer performance exported as CSV.');
  };

  if (performanceQuery.isLoading) {
    return <PageState title="Loading engineer performance" description="Pulling users and ticket ownership data from the backend." />;
  }

  if (performanceQuery.error) {
    return <ErrorState message={performanceQuery.error} onRetry={performanceQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link to="/agent/analytics" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" />
        Back To Overview
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Engineer Performance</h1>
          <p className="mt-1 text-sm text-slate-500">Resolved load, active backlog, and ownership across support contributors.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            {analyticsPeriodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'ALL' | BackendRole)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Roles</option>
            <option value="SE">Support Engineers</option>
            <option value="PL">Project Leads</option>
          </select>
          <button
            onClick={performanceQuery.reload}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            Copy Summary
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active Contributors" value={String(activeContributors)} hint="Users with active status" />
        <SummaryCard label="Resolved Tickets" value={String(resolvedTickets)} hint="Within the selected period" />
        <SummaryCard label="Avg Open Load" value={averageOpenLoad} hint="Open tickets per active contributor" />
        <SummaryCard label="Critical Owned" value={String(criticalTickets)} hint="Critical tickets currently assigned" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Resolved Leaderboard</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Top contributors by resolved tickets</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="resolved" name="Resolved" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Contributor Details</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Live ownership snapshot for the selected filters</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Contributor</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Resolved</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Open</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Avg Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No contributors match the selected filters.
                    </td>
                  </tr>
                ) : (
                  performanceRows.map((row) => (
                    <tr key={row.user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{row.user.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatRoleLabel(row.user.role)}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900">{row.resolved}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900">{row.open}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatAnalyticsHours(row.averageResolutionHours)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Performance analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/pages/analytics/KBAnalytics.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Download, RefreshCw, Sparkles } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  buildTimeBuckets,
  countItemsInBuckets,
  downloadCsvFile,
  filterItemsByPeriod,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { buildDraftQueue } from '../../lib/drafts';
import { formatDateTime } from '../../lib/format';
import type { ApiRunbook, ApiTicket } from '../../lib/types';

const categoryPalette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      {label ? <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.color}`} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-bold text-slate-500">{entry.name}</span>
            <span className="ml-auto font-black text-slate-900">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function KBAnalytics() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('90d');

  const kbQuery = useAsyncData(
    async () => {
      const [runbooks, tickets] = await Promise.all([apiFetch<ApiRunbook[]>('/runbooks'), apiFetch<ApiTicket[]>('/reports/tickets')]);
      return { runbooks, tickets };
    },
    [],
  );

  const runbooks = kbQuery.data?.runbooks || [];
  const resolvedTickets = useMemo(
    () => filterItemsByPeriod((kbQuery.data?.tickets || []).filter((ticket) => ticket.status === 'RESOLVED'), (ticket) => ticket.createdAt, period),
    [kbQuery.data?.tickets, period],
  );
  const runbooksInPeriod = useMemo(() => filterItemsByPeriod(runbooks, (runbook) => runbook.createdAt, period), [period, runbooks]);

  const draftSuggestions = useMemo(() => buildDraftQueue(resolvedTickets, runbooks), [resolvedTickets, runbooks]);

  const coverageTrend = useMemo(() => {
    const buckets = buildTimeBuckets(period);
    const newRunbooks = countItemsInBuckets(runbooksInPeriod, (runbook) => runbook.createdAt, buckets);
    const resolvedCounts = countItemsInBuckets(resolvedTickets, (ticket) => ticket.createdAt, buckets);

    return buckets.map((bucket, index) => ({
      name: bucket.label,
      runbooks: newRunbooks[index],
      resolved: resolvedCounts[index],
    }));
  }, [period, resolvedTickets, runbooksInPeriod]);

  const categoryData = useMemo(() => {
    const counts = runbooks.reduce<Record<string, number>>((accumulator, runbook) => {
      const key = runbook.category?.trim() || 'Uncategorized';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value,
        color: categoryPalette[index % categoryPalette.length],
      }))
      .sort((left, right) => right.value - left.value);
  }, [runbooks]);

  const recentRunbooks = useMemo(
    () => [...runbooks].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 5),
    [runbooks],
  );

  const handleExport = () => {
    downloadCsvFile(
      `kb-analytics-${period}.csv`,
      ['Runbook ID', 'Title', 'Category', 'Created At', 'Updated At', 'Author'],
      runbooks.map((runbook) => [
        runbook.displayId,
        runbook.title,
        runbook.category || 'Uncategorized',
        formatDateTime(runbook.createdAt),
        formatDateTime(runbook.updatedAt),
        runbook.createdBy?.name || 'Unknown',
      ]),
    );
    showToast('success', 'Knowledge-base analytics exported as CSV.');
  };

  if (kbQuery.isLoading) {
    return <PageState title="Loading KB analytics" description="Pulling runbooks and resolved tickets from the backend." />;
  }

  if (kbQuery.error) {
    return <ErrorState message={kbQuery.error} onRetry={kbQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link to="/agent/analytics" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" />
        Back To Overview
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Knowledge Base Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Live visibility into runbook growth and unresolved documentation opportunities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-purple-500"
          >
            {analyticsPeriodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={kbQuery.reload}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={BookOpen} label="Total Runbooks" value={String(runbooks.length)} hint={`${runbooksInPeriod.length} created in range`} iconClasses="bg-blue-50 text-blue-600 border-blue-100" />
        <SummaryCard icon={Sparkles} label="Draft Opportunities" value={String(draftSuggestions.length)} hint="Derived from resolved tickets" iconClasses="bg-purple-50 text-purple-600 border-purple-100" />
        <SummaryCard icon={BookOpen} label="Resolved Tickets" value={String(resolvedTickets.length)} hint="Potential KB sources" iconClasses="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <SummaryCard icon={Sparkles} label="Categories" value={String(categoryData.length)} hint="Distinct runbook groupings" iconClasses="bg-orange-50 text-orange-600 border-orange-100" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Runbook Creation vs Resolved Tickets</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Shows how quickly the KB is keeping pace with solved work</p>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={coverageTrend} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="runbooks" name="Runbooks Added" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="resolved" name="Resolved Tickets" stroke="#10b981" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Category Spread</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">How the knowledge base is distributed</p>
          </div>
          {categoryData.length === 0 ? (
            <div className="flex h-[340px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">No runbooks available yet.</div>
          ) : (
            <>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={90} paddingAngle={4} stroke="none">
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {categoryData.slice(0, 6).map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="font-bold text-slate-600">{entry.name}</span>
                    </div>
                    <span className="font-black text-slate-900">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Recent Runbooks</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Latest updated entries</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentRunbooks.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">No runbooks have been created yet.</div>
            ) : (
              recentRunbooks.map((runbook) => (
                <div key={runbook.id} className="px-6 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{runbook.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {runbook.displayId} • {runbook.category || 'Uncategorized'} • Updated {formatDateTime(runbook.updatedAt)}
                      </p>
                    </div>
                    <Link to={`/agent/kb/edit/${runbook.id}`} className="text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700">
                      Open
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">Draft Queue Signals</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Resolved tickets that still need documentation</p>
              </div>
              <Link to="/agent/kb/review" className="text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700">
                Review Queue
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {draftSuggestions.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">No pending draft opportunities in the selected time range.</div>
            ) : (
              draftSuggestions.slice(0, 5).map((draft) => (
                <div key={draft.ticketId} className="px-6 py-4">
                  <p className="font-bold text-slate-900">{draft.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ticket {draft.ticketDisplayId} • Confidence {Math.round(draft.confidence * 100)}% • {draft.category}
                  </p>
                  <Link to={`/agent/kb/auto-draft/${draft.ticketId}`} className="mt-2 inline-block text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700">
                    Open Draft
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClasses,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  hint: string;
  iconClasses: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClasses}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">KB analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/pages/analytics/TicketAnalytics.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  buildTimeBuckets,
  calculateAverageResolutionHours,
  countItemsInBuckets,
  downloadCsvFile,
  filterItemsByPeriod,
  formatAnalyticsHours,
  formatAnalyticsPercent,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { formatDateTime, humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiTicket, TicketPriority, TicketStatus } from '../../lib/types';

const priorityOrder: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const priorityColors: Record<TicketPriority, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#f59e0b',
  HIGH: '#ea580c',
  CRITICAL: '#ef4444',
};

const statusOrder: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      {label ? <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.color}`} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-bold text-slate-500">{entry.name}</span>
            <span className="ml-auto font-black text-slate-900">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TicketAnalytics() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('90d');
  const [projectId, setProjectId] = useState('');

  const analyticsQuery = useAsyncData(
    async () => {
      const [tickets, projects] = await Promise.all([apiFetch<ApiTicket[]>('/reports/tickets'), apiFetch<ApiProject[]>('/projects')]);
      return { tickets, projects };
    },
    [],
  );

  const tickets = analyticsQuery.data?.tickets || [];
  const projects = analyticsQuery.data?.projects || [];

  const filteredTickets = useMemo(() => {
    const ticketsInPeriod = filterItemsByPeriod(tickets, (ticket) => ticket.createdAt, period);
    return projectId ? ticketsInPeriod.filter((ticket) => String(ticket.project?.id || '') === projectId) : ticketsInPeriod;
  }, [period, projectId, tickets]);

  const trendData = useMemo(() => {
    const buckets = buildTimeBuckets(period);
    const openedCounts = countItemsInBuckets(filteredTickets, (ticket) => ticket.createdAt, buckets);
    const resolvedCounts = countItemsInBuckets(
      filteredTickets.filter((ticket) => ticket.resolvedAt),
      (ticket) => ticket.resolvedAt,
      buckets,
    );

    return buckets.map((bucket, index) => ({
      name: bucket.label,
      opened: openedCounts[index],
      resolved: resolvedCounts[index],
    }));
  }, [filteredTickets, period]);

  const priorityData = useMemo(
    () =>
      priorityOrder.map((priority) => ({
        name: humanizeEnum(priority),
        value: filteredTickets.filter((ticket) => ticket.priority === priority).length,
        fill: priorityColors[priority],
      })),
    [filteredTickets],
  );

  const statusRows = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        count: filteredTickets.filter((ticket) => ticket.status === status).length,
      })),
    [filteredTickets],
  );

  const resolvedCount = filteredTickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const openCount = filteredTickets.filter((ticket) => ticket.status !== 'RESOLVED').length;
  const escalatedCount = filteredTickets.filter((ticket) => ticket.status === 'ESCALATED').length;
  const resolutionRate = filteredTickets.length ? (resolvedCount / filteredTickets.length) * 100 : null;
  const escalationRate = filteredTickets.length ? (escalatedCount / filteredTickets.length) * 100 : null;
  const averageResolution = calculateAverageResolutionHours(filteredTickets);

  const handleExport = () => {
    downloadCsvFile(
      `ticket-analytics-${period}.csv`,
      ['Ticket ID', 'Title', 'Client', 'Project', 'Priority', 'Status', 'Assignee', 'Created At', 'Resolved At'],
      filteredTickets.map((ticket) => [
        ticket.displayId,
        ticket.title,
        ticket.project?.client?.name || '—',
        ticket.project?.name || '—',
        humanizeEnum(ticket.priority),
        humanizeEnum(ticket.status),
        ticket.assignedTo?.name || 'Unassigned',
        formatDateTime(ticket.createdAt),
        ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '—',
      ]),
    );
    showToast('success', 'Ticket analytics exported as CSV.');
  };

  if (analyticsQuery.isLoading) {
    return <PageState title="Loading ticket analytics" description="Pulling the latest ticket and project data from the backend." />;
  }

  if (analyticsQuery.error) {
    return <ErrorState message={analyticsQuery.error} onRetry={analyticsQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link to="/agent/analytics" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" />
        Back To Overview
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Ticket Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Resolution speed, backlog health, and priority distribution from live tickets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            {analyticsPeriodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            onClick={analyticsQuery.reload}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Avg Resolution" value={formatAnalyticsHours(averageResolution)} hint="Resolved tickets only" />
        <SummaryCard label="Resolution Rate" value={formatAnalyticsPercent(resolutionRate)} hint={`${resolvedCount} resolved tickets`} />
        <SummaryCard label="Escalation Rate" value={formatAnalyticsPercent(escalationRate)} hint={`${escalatedCount} escalated tickets`} />
        <SummaryCard label="Open Backlog" value={String(openCount)} hint="Tickets not yet resolved" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Opened vs Resolved</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Trend across the selected time range</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="opened" name="Opened" stroke="#ea580c" fill="url(#openedGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="url(#resolvedGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Priority Mix</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Distribution by urgency</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Tickets" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Status Breakdown</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">A quick view of where work is sitting right now</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-5">
          {statusRows.map((row) => (
            <div key={row.status} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{humanizeEnum(row.status)}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{row.count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Ticket analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/pages/client/ClientDashboard.tsx
````typescript
import { Link } from 'react-router-dom';
import { Bot, FileQuestion, MessageSquareShare, ShieldCheck } from 'lucide-react';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { DEFAULT_WIDGET_KEY } from '../../lib/config';
import type { WidgetFaqResponse } from '../../lib/types';

export default function ClientDashboard() {
  const widgetQuery = useAsyncData(
    () => apiFetch<WidgetFaqResponse>(`/widget/${DEFAULT_WIDGET_KEY}/faqs`, { auth: false }),
    [],
  );

  if (widgetQuery.isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 bg-white rounded-3xl border border-slate-200 shadow-sm" />
          ))}
        </div>
        <div className="h-96 bg-white rounded-3xl border border-slate-200 shadow-sm" />
      </div>
    );
  }

  if (widgetQuery.error || !widgetQuery.data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white border border-red-200 rounded-3xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Support view unavailable</h1>
          <p className="text-sm text-slate-500 mt-3">{widgetQuery.error || 'Unable to load project support data.'}</p>
          <button
            onClick={widgetQuery.reload}
            className="mt-5 px-5 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { project, faqs } = widgetQuery.data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{project.name} Support Overview</h1>
          <p className="text-slate-500 mt-2">This public support area is now powered by the same project data the widget uses.</p>
        </div>
        <Link
          to="/submit-ticket"
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-bold transition-colors shadow-sm text-center"
        >
          Create support ticket
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <OverviewCard icon={FileQuestion} label="Project FAQs" value={String(faqs.length)} accent="orange" />
        <OverviewCard icon={Bot} label="AI Support" value="Julia" accent="purple" />
        <OverviewCard icon={ShieldCheck} label="Project Status" value={project.status} accent="green" />
        <OverviewCard icon={MessageSquareShare} label="Support Path" value="FAQ → AI → Human" accent="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Available FAQs</h2>
            <p className="text-sm text-slate-500 mt-2">These are the exact FAQs available inside the Julia widget.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {faqs.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No FAQs are configured for this project yet.</div>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="p-6">
                  <h3 className="text-base font-bold text-slate-900">{faq.question}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{faq.answer}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900">How support works</h2>
            <div className="mt-5 space-y-4">
              {[
                ['1', 'Check FAQs', 'Start with the project knowledge already published by the team.'],
                ['2', 'Ask Julia', 'Use the widget for contextual AI help scoped to this project.'],
                ['3', 'Escalate', 'If the issue remains, submit a ticket for the internal team.'],
              ].map(([step, title, description]) => (
                <div key={step} className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black shrink-0">
                    {step}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-6">
            <h2 className="text-xl font-bold">Need human help now?</h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              The standalone ticket form now submits straight to the backend using this project’s widget key.
            </p>
            <Link
              to="/submit-ticket"
              className="mt-5 inline-flex items-center justify-center px-5 py-3 bg-orange-600 hover:bg-orange-700 rounded-2xl font-bold transition-colors"
            >
              Submit a direct escalation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FileQuestion;
  label: string;
  value: string;
  accent: 'orange' | 'purple' | 'green' | 'blue';
}) {
  const theme =
    accent === 'purple'
      ? 'bg-purple-50 text-purple-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : accent === 'blue'
          ? 'bg-blue-50 text-blue-600'
          : 'bg-orange-50 text-orange-600';

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/client/ClientLanding.tsx
````typescript
import { Link } from 'react-router-dom';
import { Bot, FileQuestion, Headset } from 'lucide-react';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { DEFAULT_WIDGET_KEY } from '../../lib/config';
import type { WidgetFaqResponse } from '../../lib/types';

export default function ClientLanding() {
  const widgetQuery = useAsyncData(
    () => apiFetch<WidgetFaqResponse>(`/widget/${DEFAULT_WIDGET_KEY}/faqs`, { auth: false }),
    [],
  );

  if (widgetQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-4xl space-y-6 animate-pulse">
          <div className="h-12 w-72 bg-slate-200 rounded-2xl mx-auto" />
          <div className="h-5 w-[32rem] max-w-full bg-slate-200 rounded-xl mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 bg-white border border-slate-200 rounded-3xl shadow-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (widgetQuery.error || !widgetQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-white border border-red-200 rounded-3xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Support center unavailable</h1>
          <p className="text-sm text-slate-500 mt-3">{widgetQuery.error || 'Unable to load project support details right now.'}</p>
          <button
            onClick={widgetQuery.reload}
            className="mt-5 px-5 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { project, faqs } = widgetQuery.data;

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-[0.2em]">
            ATC Support
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mt-5">{project.name} Support Center</h1>
          <p className="text-lg text-slate-600 mt-4">
            Start with project FAQs, chat with Julia in the widget, or create a human support ticket directly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={FileQuestion}
            title={`${faqs.length} live FAQ${faqs.length === 1 ? '' : 's'}`}
            description="Browse project-specific answers pulled from the backend."
          />
          <FeatureCard
            icon={Bot}
            title="Julia AI is ready"
            description="Use the widget in the bottom-right corner for guided troubleshooting."
          />
          <FeatureCard
            icon={Headset}
            title="Human escalation"
            description="Create a direct support ticket if you already know you need help."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Popular help topics</h2>
                <p className="text-sm text-slate-500 mt-2">These are the latest FAQs for this project.</p>
              </div>
              <Link to="/dashboard" className="text-sm font-bold text-orange-600 hover:text-orange-700">
                Open support view
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {faqs.slice(0, 4).map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-base font-bold text-slate-900">{faq.question}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-8 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Current Project</p>
            <h2 className="text-3xl font-black mt-4">{project.name}</h2>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed">
              The widget and standalone form are currently scoped to this project’s backend data using the configured widget key.
            </p>

            <div className="mt-8 space-y-3">
              <Link
                to="/submit-ticket"
                className="block w-full text-center px-5 py-3 bg-orange-600 hover:bg-orange-700 rounded-2xl font-bold transition-colors"
              >
                Submit a ticket
              </Link>
              <Link
                to="/dashboard"
                className="block w-full text-center px-5 py-3 bg-white/10 hover:bg-white/15 rounded-2xl font-bold transition-colors"
              >
                Browse support resources
              </Link>
            </div>

            <p className="text-xs text-slate-400 mt-6">
              Need guided help? Open the Julia widget in the bottom-right corner to start a live project-scoped support session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileQuestion;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mt-5">{title}</h2>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
    </div>
  );
}
````

## File: Frontend/src/pages/client/FallbackTicketForm.tsx
````typescript
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, FileQuestion, Send } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { DEFAULT_WIDGET_KEY } from '../../lib/config';
import type { ApiTicket, TicketPriority, WidgetFaqResponse } from '../../lib/types';

const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function FallbackTicketForm() {
  const { showToast } = useToast();
  const widgetQuery = useAsyncData(
    () => apiFetch<WidgetFaqResponse>(`/widget/${DEFAULT_WIDGET_KEY}/faqs`, { auth: false }),
    [],
  );
  const [form, setForm] = useState({
    name: '',
    email: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as TicketPriority,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<ApiTicket | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiFetch<ApiTicket>('/tickets', {
        method: 'POST',
        auth: false,
        body: {
          widgetKey: DEFAULT_WIDGET_KEY,
          name: form.name.trim(),
          email: form.email.trim(),
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
        },
      });

      setSubmittedTicket(response);
      setForm({
        name: '',
        email: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
      });
      showToast('success', 'Support ticket submitted successfully.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectName = widgetQuery.data?.project.name || 'Selected Project';

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/70">
              <h1 className="text-3xl font-bold text-slate-900">Submit Support Ticket</h1>
              <p className="text-slate-500 mt-2">
                This form now creates a real backend ticket for <span className="font-semibold text-slate-700">{projectName}</span>.
              </p>
            </div>

            {submittedTicket ? (
              <div className="p-8">
                <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white text-green-600 flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mt-5">Ticket submitted</h2>
                  <p className="text-sm text-slate-600 mt-3">Your request has been escalated to the support team.</p>
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-orange-600 font-mono font-bold border border-orange-100">
                    {submittedTicket.displayId}
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setSubmittedTicket(null)}
                      className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-colors"
                    >
                      Submit another ticket
                    </button>
                    <Link
                      to="/"
                      className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold border border-slate-200 transition-colors"
                    >
                      Return to support home
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <form className="p-8 space-y-6" onSubmit={(event) => void handleSubmit(event)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Full Name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                    placeholder="Ravi Kumar"
                  />
                  <FormField
                    label="Work Email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                    placeholder="ravi@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Related Project</label>
                  <input
                    type="text"
                    value={projectName}
                    readOnly
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
                  <FormField
                    label="Issue Title"
                    type="text"
                    required
                    value={form.title}
                    onChange={(value) => setForm((current) => ({ ...current, title: value }))}
                    placeholder="Warehouse portal access denied"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TicketPriority }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white min-w-40"
                    >
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Detailed Description</label>
                  <textarea
                    rows={6}
                    required
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                    placeholder="Describe what you tried, the exact error, and when the issue started."
                  />
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Attachments are not connected yet</p>
                    <p className="text-sm text-amber-800 mt-1">
                      File uploads are outside the current backend scope, so include any key details directly in the description for now.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || widgetQuery.isLoading || !!widgetQuery.error}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting…' : 'Submit Support Ticket'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900">Before you submit</h2>
            <p className="text-sm text-slate-500 mt-2">
              You may be able to resolve the issue faster through the project FAQ or the Julia widget.
            </p>
            <div className="mt-5 space-y-4">
              {(widgetQuery.data?.faqs || []).slice(0, 4).map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <FileQuestion className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{faq.question}</p>
                      <p className="text-sm text-slate-500 mt-1">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!widgetQuery.isLoading && (widgetQuery.data?.faqs.length || 0) === 0 && (
                <p className="text-sm text-slate-500">No FAQs are configured for this project yet.</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-6">
            <h2 className="text-xl font-bold">Live backend wiring</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>- Uses the public backend ticket endpoint.</li>
              <li>- Submits against widget key <span className="font-mono text-white">{DEFAULT_WIDGET_KEY}</span>.</li>
              <li>- Creates the same ticket type the internal queue now reads.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  type,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
      />
    </div>
  );
}
````

## File: Frontend/src/pages/kb/AutoDraftDetail.tsx
````typescript
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Clock, ExternalLink, MessageSquare, Sparkles, Ticket, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { createDraftSuggestion, dismissDraftIds } from '../../lib/drafts';
import { formatDateTime, humanizeEnum } from '../../lib/format';
import type { ApiRunbook, ApiTicket } from '../../lib/types';

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

  const handleApprove = () => {
    if (!draftQuery.data) {
      return;
    }

    openModal({
      title: 'Publish Runbook',
      content: (
        <p className="text-sm text-slate-600">
          Publish <span className="font-bold text-slate-900">{draftQuery.data.draft.title}</span> to the knowledge base?
        </p>
      ),
      primaryAction: {
        label: 'Publish',
        onClick: async () => {
          try {
            await apiFetch<ApiRunbook>('/runbooks', {
              method: 'POST',
              body: {
                title: draftQuery.data.draft.title,
                category: draftQuery.data.draft.category,
                content: draftQuery.data.draft.content,
              },
            });

            dismissDraftIds([draftQuery.data.ticket.id]);
            showToast('success', 'Runbook published to the knowledge base.');
            navigate('/agent/kb');
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
            ← Back to Review Queue
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
            onClick={handleApprove}
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
                {ticket.project && <p>Project: {ticket.project.name}</p>}
                {ticket.project?.client && <p>Client: {ticket.project.client.name}</p>}
                {ticket.assignedTo && <p>Resolved By: {ticket.assignedTo.name}</p>}
                <p>Created: {formatDateTime(ticket.createdAt)}</p>
                {ticket.resolvedAt && <p>Resolved: {formatDateTime(ticket.resolvedAt)}</p>}
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
````

## File: Frontend/src/pages/kb/ReviewQueue.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Clock, RefreshCw, Search, Sparkles, Ticket, Trash2 } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { buildDraftQueue, createDraftSuggestion, dismissDraftIds, type DraftSuggestion } from '../../lib/drafts';
import { formatRelativeTime } from '../../lib/format';
import type { ApiRunbook, ApiTicket } from '../../lib/types';

export default function ReviewQueue() {
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrafts, setSelectedDrafts] = useState<number[]>([]);

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

  const handleBulkApprove = () => {
    const selectedItems = visibleDrafts.filter((draft) => selectedDrafts.includes(draft.ticketId));

    if (selectedItems.length === 0) {
      showToast('warning', 'Select at least one draft to publish.');
      return;
    }

    openModal({
      title: 'Publish Drafts',
      content: (
        <p className="text-sm text-slate-600">
          Publish <span className="font-bold text-slate-900">{selectedItems.length}</span> draft{selectedItems.length === 1 ? '' : 's'} as runbooks?
        </p>
      ),
      primaryAction: {
        label: 'Publish',
        onClick: async () => {
          try {
            await Promise.all(
              selectedItems.map((draft) =>
                apiFetch('/runbooks', {
                  method: 'POST',
                  body: {
                    title: draft.title,
                    category: draft.category,
                    content: draft.content,
                  },
                }),
              ),
            );

            dismissDraftIds(selectedItems.map((draft) => draft.ticketId));
            setSelectedDrafts([]);
            reviewQuery.reload();
            showToast('success', `${selectedItems.length} runbook${selectedItems.length === 1 ? '' : 's'} published.`);
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Draft Review Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Resolved tickets are converted into draft runbook suggestions you can publish directly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => reviewQuery.reload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleBulkApprove}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            Publish Selected
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Pending Drafts" value={String(visibleDrafts.length)} accent="purple" />
        <StatCard label="Avg Confidence" value={`${averageConfidence}%`} accent="green" />
        <StatCard label="Published Runbooks" value={String(reviewQuery.data.runbooks.length)} accent="blue" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title, ticket ID, category, or summary…"
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
                        <Link to={`/agent/kb/auto-draft/${draft.ticketId}`} className="font-bold text-slate-900 hover:text-purple-600 transition-colors">
                          {draft.title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">{draft.summary}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/agent/ticket/${draft.ticketId}`}
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
                          to={`/agent/kb/auto-draft/${draft.ticketId}`}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
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
````

## File: Frontend/src/pages/kb/RunbookEditor.tsx
````typescript
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpenText, Eye, RefreshCw, Save, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { createDraftSuggestion } from '../../lib/drafts';
import { formatDateTime } from '../../lib/format';
import type { ApiRunbook, ApiTicket } from '../../lib/types';

type FormState = {
  title: string;
  category: string;
  content: string;
};

const emptyForm: FormState = {
  title: '',
  category: 'Operations',
  content: '',
};

export default function RunbookEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const draftTicketId = searchParams.get('draftTicketId');
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const editorQuery = useAsyncData(
    async () => {
      if (id) {
        const runbook = await apiFetch<ApiRunbook>(`/runbooks/${id}`);
        return { mode: 'runbook' as const, runbook };
      }

      if (draftTicketId) {
        const ticket = await apiFetch<ApiTicket>(`/tickets/${draftTicketId}`);
        return { mode: 'draft' as const, ticket };
      }

      return { mode: 'new' as const };
    },
    [id, draftTicketId],
  );

  useEffect(() => {
    if (!editorQuery.data) {
      return;
    }

    if (editorQuery.data.mode === 'runbook') {
      const nextForm = {
        title: editorQuery.data.runbook.title,
        category: editorQuery.data.runbook.category || 'Operations',
        content: editorQuery.data.runbook.content,
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      return;
    }

    if (editorQuery.data.mode === 'draft') {
      const draft = createDraftSuggestion(editorQuery.data.ticket);
      const nextForm = {
        title: draft.title,
        category: draft.category,
        content: draft.content,
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      return;
    }

    setForm(emptyForm);
    setInitialForm(emptyForm);
  }, [editorQuery.data]);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  const isEditing = Boolean(id);
  const sourceTicket = editorQuery.data?.mode === 'draft' ? editorQuery.data.ticket : null;
  const existingRunbook = editorQuery.data?.mode === 'runbook' ? editorQuery.data.runbook : null;

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePreview = () => {
    openModal({
      title: form.title || 'Runbook Preview',
      size: 'xl',
      content: (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-slate-500">{form.category || 'Uncategorized'}</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">{form.title || 'Untitled Runbook'}</h2>
          </div>
          <div className="prose prose-slate max-w-none">
            <Markdown>{form.content || '*No content yet.*'}</Markdown>
          </div>
        </div>
      ),
      primaryAction: {
        label: 'Close',
        onClick: () => {},
      },
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('error', 'Title and content are required.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || undefined,
        content: form.content.trim(),
      };

      const savedRunbook = isEditing
        ? await apiFetch<ApiRunbook>(`/runbooks/${id}`, { method: 'PATCH', body: payload })
        : await apiFetch<ApiRunbook>('/runbooks', { method: 'POST', body: payload });

      const nextForm = {
        title: savedRunbook.title,
        category: savedRunbook.category || 'Operations',
        content: savedRunbook.content,
      };

      setForm(nextForm);
      setInitialForm(nextForm);
      showToast('success', isEditing ? 'Runbook updated successfully.' : 'Runbook created successfully.');

      if (!isEditing) {
        navigate(`/agent/kb/edit/${savedRunbook.id}`, { replace: true });
      }
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isEditing || !id) {
      return;
    }

    openModal({
      title: 'Delete Runbook',
      content: (
        <p className="text-sm text-slate-600">
          Delete <span className="font-bold text-slate-900">{existingRunbook?.title || form.title}</span>? This cannot be undone.
        </p>
      ),
      primaryAction: {
        label: 'Delete',
        variant: 'danger',
        onClick: async () => {
          try {
            await apiFetch(`/runbooks/${id}`, { method: 'DELETE' });
            showToast('success', 'Runbook deleted.');
            navigate('/agent/kb');
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

  if (editorQuery.isLoading) {
    return <EditorSkeleton />;
  }

  if (editorQuery.error) {
    return <EditorError message={editorQuery.error} onRetry={editorQuery.reload} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link to="/agent/kb" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            ← Back to Knowledge Base
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">{isEditing ? 'Edit Runbook' : 'Create Runbook'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sourceTicket
              ? `This runbook is prefilled from resolved ticket ${sourceTicket.displayId}.`
              : 'Create or update a shared runbook backed by the live runbooks API.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => editorQuery.reload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={handlePreview}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          {isEditing && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Runbook'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder="Runbook title"
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-base font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(event) => handleChange('category', event.target.value)}
                placeholder="Operations"
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>
          <div className="p-8">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Markdown Content</label>
            <textarea
              value={form.content}
              onChange={(event) => handleChange('content', event.target.value)}
              placeholder="Write your runbook content in Markdown…"
              className="w-full min-h-[32rem] px-4 py-4 border border-slate-200 rounded-2xl text-sm font-mono leading-relaxed focus:ring-2 focus:ring-orange-500 outline-none resize-y"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <BookOpenText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Editor State</p>
                <p className="text-lg font-bold text-slate-900">{isDirty ? 'Unsaved changes' : 'Up to date'}</p>
              </div>
            </div>
          </div>

          {existingRunbook && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Runbook Metadata</p>
              {existingRunbook.createdBy && <p className="text-sm text-slate-700">Author: {existingRunbook.createdBy.name}</p>}
              <p className="text-sm text-slate-700">Created: {formatDateTime(existingRunbook.createdAt)}</p>
              <p className="text-sm text-slate-700">Updated: {formatDateTime(existingRunbook.updatedAt)}</p>
              <p className="text-sm text-slate-700">Display ID: {existingRunbook.displayId}</p>
            </div>
          )}

          {sourceTicket && (
            <div className="bg-purple-50 rounded-2xl border border-purple-200 shadow-sm p-6 space-y-3">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Draft Source Ticket</p>
              <p className="text-lg font-bold text-slate-900">{sourceTicket.title}</p>
              <p className="text-sm text-slate-600">{sourceTicket.description || 'No ticket description provided.'}</p>
              <Link to={`/agent/ticket/${sourceTicket.id}`} className="inline-flex text-sm font-bold text-purple-700 hover:text-purple-800">
                Open {sourceTicket.displayId}
              </Link>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>- Runbooks publish immediately when saved.</li>
              <li>- Category is optional but helps organization in the library.</li>
              <li>- Preview renders the same Markdown content you save.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-12 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="h-[44rem] bg-white rounded-3xl border border-slate-200 shadow-sm" />
        <div className="space-y-6">
          <div className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-48 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-40 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function EditorError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Runbook editor unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/kb/RunbookLibrary.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, FileText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import type { ApiProject, ApiProjectDoc, ApiRunbook } from '../../lib/types';

type ActiveTab = 'runbooks' | 'project-docs';
type ProjectDocWithProject = ApiProjectDoc & { projectName: string };

export default function RunbookLibrary() {
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('runbooks');
  const [searchQuery, setSearchQuery] = useState('');

  const libraryQuery = useAsyncData(
    async () => {
      const [runbooks, projects] = await Promise.all([apiFetch<ApiRunbook[]>('/runbooks'), apiFetch<ApiProject[]>('/projects')]);

      const docsByProject = await Promise.all(
        projects.map(async (project) => ({
          project,
          docs: await apiFetch<ApiProjectDoc[]>(`/projects/${project.id}/docs`),
        })),
      );

      const projectDocs = docsByProject.flatMap(({ project, docs }) =>
        docs.map((doc) => ({
          ...doc,
          projectName: project.name,
        })),
      );

      return {
        runbooks,
        projectDocs,
        projectCount: projects.length,
      };
    },
    [],
  );

  const filteredRunbooks = useMemo(() => {
    const runbooks = libraryQuery.data?.runbooks || [];

    return runbooks.filter((runbook) =>
      `${runbook.displayId} ${runbook.title} ${runbook.category || ''} ${runbook.content}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );
  }, [libraryQuery.data?.runbooks, searchQuery]);

  const filteredDocs = useMemo(() => {
    const docs = libraryQuery.data?.projectDocs || [];

    return docs.filter((doc) =>
      `${doc.title} ${doc.projectName} ${doc.content}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );
  }, [libraryQuery.data?.projectDocs, searchQuery]);

  const previewMarkdown = (title: string, subtitle: string, content: string) => {
    openModal({
      title,
      size: 'xl',
      content: (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">{subtitle}</p>
          <div className="prose prose-slate max-w-none prose-headings:font-bold">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      ),
      primaryAction: {
        label: 'Close',
        onClick: () => {},
      },
    });
  };

  const confirmDeleteRunbook = (runbook: ApiRunbook) => {
    openModal({
      title: 'Delete Runbook',
      content: (
        <p className="text-sm text-slate-600">
          Delete <span className="font-bold text-slate-900">{runbook.title}</span>? This removes it from the shared knowledge base.
        </p>
      ),
      primaryAction: {
        label: 'Delete',
        variant: 'danger',
        onClick: async () => {
          try {
            await apiFetch(`/runbooks/${runbook.id}`, { method: 'DELETE' });
            showToast('success', 'Runbook deleted.');
            libraryQuery.reload();
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

  const confirmDeleteDoc = (doc: ProjectDocWithProject) => {
    openModal({
      title: 'Delete Project Document',
      content: (
        <p className="text-sm text-slate-600">
          Delete <span className="font-bold text-slate-900">{doc.title}</span> from <span className="font-bold text-slate-900">{doc.projectName}</span>?
        </p>
      ),
      primaryAction: {
        label: 'Delete',
        variant: 'danger',
        onClick: async () => {
          try {
            await apiFetch(`/docs/${doc.id}`, { method: 'DELETE' });
            showToast('success', 'Project document deleted.');
            libraryQuery.reload();
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

  if (libraryQuery.isLoading) {
    return <LibrarySkeleton />;
  }

  if (libraryQuery.error || !libraryQuery.data) {
    return <LibraryError message={libraryQuery.error || 'Unable to load the knowledge base.'} onRetry={libraryQuery.reload} />;
  }

  const categoryCount = new Set(libraryQuery.data.runbooks.map((runbook) => runbook.category || 'Uncategorized')).size;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="mt-1 text-sm text-slate-500">Runbooks and project docs are loaded live from the backend.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/agent/kb/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" />
            New Runbook
          </Link>
          <button
            onClick={libraryQuery.reload}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <MetricCard icon={BookOpenText} label="Runbooks" value={String(libraryQuery.data.runbooks.length)} accent="orange" />
        <MetricCard icon={FileText} label="Project Docs" value={String(libraryQuery.data.projectDocs.length)} accent="blue" />
        <MetricCard icon={BookOpenText} label="Categories" value={String(categoryCount)} accent="green" />
        <MetricCard icon={FileText} label="Projects" value={String(libraryQuery.data.projectCount)} accent="blue" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex border-b border-slate-200">
          <TabButton label="Runbooks" active={activeTab === 'runbooks'} onClick={() => setActiveTab('runbooks')} />
          <TabButton label="Project Docs" active={activeTab === 'project-docs'} onClick={() => setActiveTab('project-docs')} />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={activeTab === 'runbooks' ? 'Search runbooks…' : 'Search project docs…'}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {activeTab === 'runbooks' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredRunbooks.length === 0 ? (
            <EmptyPanel title="No runbooks found" message="Try a different search, or create your first runbook." />
          ) : (
            filteredRunbooks.map((runbook) => (
              <article key={runbook.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{runbook.title}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">{runbook.displayId}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {runbook.category ? (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 font-bold uppercase tracking-wider text-orange-700">
                          {runbook.category}
                        </span>
                      ) : null}
                      {runbook.createdBy && <span>{runbook.createdBy.name}</span>}
                      <span>•</span>
                      <span>Updated {formatRelativeTime(runbook.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDeleteRunbook(runbook)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${runbook.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-4 line-clamp-4 text-sm text-slate-500">{runbook.content}</p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-400">Created {formatDateTime(runbook.createdAt)}</span>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/agent/kb/edit/${runbook.id}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => previewMarkdown(runbook.title, `Runbook ${runbook.displayId}`, runbook.content)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredDocs.length === 0 ? (
            <EmptyPanel title="No project docs found" message="Docs will appear here once they are created on the project-specific endpoints." />
          ) : (
            filteredDocs.map((doc) => (
              <article key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{doc.title}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold uppercase tracking-wider text-blue-700">{doc.projectName}</span>
                      {doc.createdBy && <span>{doc.createdBy.name}</span>}
                      <span>•</span>
                      <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDeleteDoc(doc)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-4 line-clamp-4 text-sm text-slate-500">{doc.content}</p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-400">Created {formatDateTime(doc.createdAt)}</span>
                  <button
                    onClick={() => previewMarkdown(doc.title, `Project document for ${doc.projectName}`, doc.content)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    Preview
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof BookOpenText;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
        active ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}

function LibraryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Knowledge base unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/settings/GeneralSettings.tsx
````typescript
import { useEffect, useMemo, useState } from 'react';
import { Info, RefreshCw, Save, Server, UserRound } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { API_BASE_URL, storageKeys } from '../../lib/config';
import { apiFetch } from '../../lib/api';
import { formatRoleLabel } from '../../lib/format';
import type { DashboardStats } from '../../lib/types';

type WorkspaceSettings = {
  workspaceName: string;
  supportEmail: string;
  portalUrl: string;
  timezone: string;
};

const buildDefaultSettings = (email?: string): WorkspaceSettings => ({
  workspaceName: 'ATC Support',
  supportEmail: email || 'support@localhost',
  portalUrl: typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
});

const readStoredSettings = (email?: string) => {
  const fallback = buildDefaultSettings(email);

  if (typeof window === 'undefined') {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(storageKeys.workspaceSettings);

  if (!rawValue) {
    return fallback;
  }

  try {
    return {
      ...fallback,
      ...(JSON.parse(rawValue) as Partial<WorkspaceSettings>),
    };
  } catch {
    return fallback;
  }
};

const humanizeStatKey = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase())
    .trim();

export default function GeneralSettings() {
  const { showToast } = useToast();
  const { user, backendRole } = useRole();
  const [settings, setSettings] = useState<WorkspaceSettings>(() => readStoredSettings(user?.email));

  const statsQuery = useAsyncData(() => apiFetch<DashboardStats>('/dashboard/stats'), []);

  useEffect(() => {
    const hasStoredSettings = typeof window !== 'undefined' && window.localStorage.getItem(storageKeys.workspaceSettings);

    if (!hasStoredSettings && user?.email) {
      setSettings((current) => ({
        ...current,
        supportEmail: user.email,
      }));
    }
  }, [user?.email]);

  const statEntries = useMemo(
    () =>
      Object.entries(statsQuery.data || {})
        .filter(([key, value]) => key !== 'role' && typeof value === 'number')
        .map(([key, value]) => ({ key, value: String(value) })),
    [statsQuery.data],
  );

  const handleChange =
    (field: keyof WorkspaceSettings) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setSettings((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSave = () => {
    window.localStorage.setItem(storageKeys.workspaceSettings, JSON.stringify(settings));
    showToast('success', 'Workspace preferences saved locally in this browser.');
  };

  const handleReset = () => {
    const defaults = buildDefaultSettings(user?.email);
    window.localStorage.removeItem(storageKeys.workspaceSettings);
    setSettings(defaults);
    showToast('info', 'Workspace preferences reset to defaults.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">General Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Browser-local workspace preferences plus a live backend connection snapshot.</p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Settings persistence is local for now.</p>
            <p className="mt-1 text-blue-800">
              The current backend spec does not include a settings endpoint, so these values are stored in this browser only.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr,1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Workspace Preferences</h3>
          </div>
          <div className="space-y-5 p-6">
            <Field label="Workspace Name">
              <input
                type="text"
                value={settings.workspaceName}
                onChange={handleChange('workspaceName')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </Field>

            <Field label="Default Support Email">
              <input
                type="email"
                value={settings.supportEmail}
                onChange={handleChange('supportEmail')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </Field>

            <Field label="Support Portal URL">
              <input
                type="url"
                value={settings.portalUrl}
                onChange={handleChange('portalUrl')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </Field>

            <Field label="Timezone">
              <select
                value={settings.timezone}
                onChange={handleChange('timezone')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
              >
                {[settings.timezone, 'Asia/Calcutta', 'UTC', 'America/New_York', 'Europe/London'].filter((value, index, values) => values.indexOf(value) === index).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              onClick={handleReset}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
            >
              <Save className="h-4 w-4" />
              Save Preferences
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Backend Connection</h3>
                <p className="mt-2 text-sm font-bold text-slate-900">{statsQuery.error ? 'Needs attention' : 'Connected'}</p>
                <p className="mt-1 text-xs text-slate-500">{API_BASE_URL}</p>
              </div>
              <button
                onClick={statsQuery.reload}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <InfoRow icon={Server} label="API Base" value={API_BASE_URL} />
              <InfoRow icon={UserRound} label="Current Access" value={backendRole ? formatRoleLabel(backendRole) : 'Loading'} />
              <InfoRow icon={UserRound} label="Signed In As" value={user?.email || 'Loading'} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Accessible Stats</h3>
            {statsQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading live counts…</p>
            ) : statsQuery.error ? (
              <p className="mt-4 text-sm text-red-600">{statsQuery.error}</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {statEntries.map((entry) => (
                  <div key={entry.key} className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{humanizeStatKey(entry.key)}</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{entry.value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-1 break-all text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/settings/Integrations.tsx
````typescript
import { Link as LinkIcon, CheckCircle2, AlertCircle, Plus, Settings } from 'lucide-react';

export default function Integrations() {
  const integrations = [
    { id: 1, name: 'Slack', description: 'Send ticket notifications and updates to Slack channels.', status: 'Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' },
    { id: 2, name: 'Jira', description: 'Link support tickets to Jira engineering issues.', status: 'Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Jira_Logo.svg' },
    { id: 3, name: 'GitHub', description: 'Create and link GitHub issues directly from tickets.', status: 'Not Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg' },
    { id: 4, name: 'Salesforce', description: 'Sync client data and view CRM context in tickets.', status: 'Not Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Integrations</h2>
          <p className="text-sm text-slate-500 mt-1">Connect your workspace with third-party tools.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Browse App Directory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map(integration => (
          <div key={integration.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-2">
                  <img src={integration.icon} alt={integration.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{integration.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{integration.description}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {integration.status === 'Connected' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Not Connected</span>
                  </>
                )}
              </div>
              
              {integration.status === 'Connected' ? (
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>
              ) : (
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm">
                  <LinkIcon className="w-3.5 h-3.5" /> Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/settings/SecuritySettings.tsx
````typescript
import { Shield, Key, Lock, Smartphone } from 'lucide-react';

export default function SecuritySettings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Security & Authentication</h2>
        <p className="text-sm text-slate-500 mt-1">Manage password policies, 2FA, and API access.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Authentication Policies</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enforce security standards across your workspace.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-500">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Require Two-Factor Authentication (2FA)</h4>
                <p className="text-sm text-slate-500 mt-1">Force all agents and admins to use 2FA when logging in.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <hr className="border-slate-100" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">SSO (Single Sign-On)</h4>
                <p className="text-sm text-slate-500 mt-1">Allow users to log in using Google Workspace or Okta.</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              Configure SSO
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">API Keys</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage keys for programmatic access to the API.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Keys</span>
              <button className="text-sm font-bold text-blue-600 hover:underline">Generate New Key</button>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Production API Key</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">sk_live_*******************</p>
                </div>
                <button className="text-sm font-bold text-red-600 hover:underline">Revoke</button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Development Key</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">sk_test_*******************</p>
                </div>
                <button className="text-sm font-bold text-red-600 hover:underline">Revoke</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/settings/ServiceCodesSettings.tsx
````typescript
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, RefreshCw, Search } from 'lucide-react';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import type { ApiAmc, ApiClient, ApiClientDetail } from '../../lib/types';

type CoverageRow = ApiAmc & {
  clientId: number;
  clientName: string;
  clientDisplayId: string;
  projectName: string;
};

export default function ServiceCodesSettings() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');

  const coverageQuery = useAsyncData(
    async () => {
      const clients = await apiFetch<ApiClient[]>('/clients');
      const clientDetails = await Promise.all(clients.map((client) => apiFetch<ApiClientDetail>(`/clients/${client.id}`)));

      const rows = clientDetails.flatMap<CoverageRow>((client) =>
        client.amcs.map((amc) => ({
          ...amc,
          clientId: client.id,
          clientName: client.name,
          clientDisplayId: client.displayId,
          projectName: amc.project?.name || client.projects.find((project) => project.id === amc.projectId)?.name || 'Unassigned',
        })),
      );

      return rows;
    },
    [],
  );

  const rows = coverageQuery.data || [];
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = `${row.displayId} ${row.clientName} ${row.projectName}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((row) => row.status === 'ACTIVE').length;
  const totalHoursRemaining = rows.reduce((total, row) => total + Math.max(row.hoursIncluded - row.hoursUsed, 0), 0);
  const expiringSoon = rows.filter((row) => {
    const endDate = new Date(row.endDate).getTime();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1_000;
    return endDate >= now && endDate <= now + thirtyDays;
  }).length;

  if (coverageQuery.isLoading) {
    return <PageState title="Loading AMC coverage" description="Gathering live contract coverage records from each client." />;
  }

  if (coverageQuery.error) {
    return <ErrorState message={coverageQuery.error} onRetry={coverageQuery.reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">AMC Coverage</h2>
          <p className="mt-1 text-sm text-slate-500">Live AMC records from the backend, used as a practical stand-in until billing/service codes are added.</p>
        </div>
        <button
          onClick={coverageQuery.reload}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Why this replaced service codes</p>
            <p className="mt-1 text-blue-800">
              Service-code billing is out of scope in the current backend spec. We are showing real AMC coverage here instead so the page still provides useful operational data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard label="Total AMCs" value={String(rows.length)} hint={`${activeCount} active`} />
        <SummaryCard label="Hours Remaining" value={String(totalHoursRemaining)} hint="Across all visible contracts" />
        <SummaryCard label="Expiring Soon" value={String(expiringSoon)} hint="Ending in the next 30 days" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr),180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by AMC, client, or project…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Statuses</option>
            {[...new Set(rows.map((row) => row.status))].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">AMC</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Client</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Project</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Hours</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Utilization</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">End Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No AMC records matched the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const utilization = row.hoursIncluded ? Math.round((row.hoursUsed / row.hoursIncluded) * 100) : 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{row.displayId}</p>
                          <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(row.endDate)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{row.clientName}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.clientDisplayId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.projectName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.hoursUsed} / {row.hoursIncluded}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min(utilization, 100)}%` }} />
                          </div>
                          <p className="mt-2 text-xs font-bold text-slate-500">{utilization}% used</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(row.endDate)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                            row.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/agent/clients/${row.clientId}`}
                          className="text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700"
                        >
                          View Client
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">AMC coverage unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/pages/settings/SettingsLayout.tsx
````typescript
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Settings, Users, FileCode } from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'General', path: '/agent/settings', icon: Settings, exact: true },
    { name: 'User Management', path: '/agent/settings/users', icon: Users },
    { name: 'AMC Coverage', path: '/agent/settings/service-codes', icon: FileCode },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your workspace, users, and global configurations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Settings Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
````

## File: Frontend/src/pages/settings/UserManagement.tsx
````typescript
import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Shield, Trash2, User as UserIcon } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDateTime, formatRoleLabel } from '../../lib/format';
import type { ApiUser, BackendRole, BackendUserStatus } from '../../lib/types';

type UserFormPayload = {
  name: string;
  email: string;
  role: BackendRole;
  status: BackendUserStatus;
  password?: string;
};

export default function UserManagement() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { backendRole, user: currentUser, refreshSession } = useRole();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | BackendRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BackendUserStatus>('ALL');

  const usersQuery = useAsyncData(() => apiFetch<ApiUser[]>('/users'), []);
  const canManageUsers = backendRole === 'PM';

  const filteredUsers = useMemo(() => {
    return (usersQuery.data || []).filter((user) => {
      const matchesSearch = `${user.displayId} ${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, usersQuery.data]);

  const handleCreate = async (payload: UserFormPayload) => {
    await apiFetch<ApiUser>('/users', {
      method: 'POST',
      body: payload,
    });

    showToast('success', 'User created successfully.');
    usersQuery.reload();
  };

  const handleUpdate = async (targetUser: ApiUser, payload: UserFormPayload) => {
    await apiFetch<ApiUser>(`/users/${targetUser.id}`, {
      method: 'PATCH',
      body: payload,
    });

    showToast('success', 'User updated successfully.');
    usersQuery.reload();

    if (currentUser?.id === targetUser.id) {
      await refreshSession();
    }
  };

  const handleDelete = async (targetUser: ApiUser) => {
    const shouldDelete = window.confirm(`Delete ${targetUser.name}? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    await apiFetch<void>(`/users/${targetUser.id}`, {
      method: 'DELETE',
    });

    showToast('success', 'User deleted successfully.');
    usersQuery.reload();

    if (currentUser?.id === targetUser.id) {
      await refreshSession();
    }
  };

  const openCreateModal = () => {
    openModal({
      title: 'Add User',
      size: 'lg',
      content: (
        <UserFormPanel
          mode="create"
          onSubmit={async (payload) => {
            await handleCreate(payload);
            closeModal();
          }}
        />
      ),
    });
  };

  const openEditModal = (targetUser: ApiUser) => {
    openModal({
      title: `Edit ${targetUser.name}`,
      size: 'lg',
      content: (
        <UserFormPanel
          mode="edit"
          user={targetUser}
          allowDelete={canManageUsers && currentUser?.id !== targetUser.id}
          onDelete={
            canManageUsers
              ? async () => {
                  await handleDelete(targetUser);
                  closeModal();
                }
              : undefined
          }
          onSubmit={async (payload) => {
            await handleUpdate(targetUser, payload);
            closeModal();
          }}
        />
      ),
    });
  };

  if (usersQuery.isLoading) {
    return <PageState title="Loading users" description="Pulling the current user directory from the backend." />;
  }

  if (usersQuery.error) {
    return <ErrorState message={usersQuery.error} onRetry={usersQuery.reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">User Management</h2>
          <p className="mt-1 text-sm text-slate-500">Live user directory with PM-only create, update, and delete controls.</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canManageUsers}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {!canManageUsers ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          You currently have read-only access here. Switch to the Project Manager role to create or edit users.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr),180px,180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or user ID…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'ALL' | BackendRole)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Roles</option>
            <option value="PM">Project Manager</option>
            <option value="PL">Project Lead</option>
            <option value="SE">Support Engineer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | BackendUserStatus)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Created</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    No users matched the current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                          {user.name
                            .split(' ')
                            .map((segment) => segment[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {user.displayId} • {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        {user.role === 'PM' ? <Shield className="h-4 w-4 text-purple-600" /> : <UserIcon className="h-4 w-4 text-slate-400" />}
                        <span className="font-medium">{formatRoleLabel(user.role)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                          user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {canManageUsers ? 'Edit' : 'View'}
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

function UserFormPanel({
  mode,
  user,
  onSubmit,
  onDelete,
  allowDelete = false,
}: {
  mode: 'create' | 'edit';
  user?: ApiUser;
  onSubmit: (payload: UserFormPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  allowDelete?: boolean;
}) {
  const { closeModal } = useModal();
  const [formState, setFormState] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: (user?.role || 'SE') as BackendRole,
    status: (user?.status || 'ACTIVE') as BackendUserStatus,
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField =
    (field: keyof typeof formState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFormState((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'create' && formState.password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!formState.name.trim() || !formState.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UserFormPayload = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
        status: formState.status,
      };

      if (formState.password.trim()) {
        payload.password = formState.password.trim();
      }

      await onSubmit(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save this user right now.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this user right now.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Full Name">
          <input
            type="text"
            value={formState.name}
            onChange={updateField('name')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            value={formState.email}
            onChange={updateField('email')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Role">
          <select
            value={formState.role}
            onChange={updateField('role')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="PM">Project Manager</option>
            <option value="PL">Project Lead</option>
            <option value="SE">Support Engineer</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            value={formState.status}
            onChange={updateField('status')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </div>

      <Field label={mode === 'create' ? 'Password' : 'Reset Password (Optional)'}>
        <input
          type="password"
          value={formState.password}
          onChange={updateField('password')}
          placeholder={mode === 'create' ? 'At least 6 characters' : 'Leave blank to keep the current password'}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          {allowDelete && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">User directory unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}
````

## File: Frontend/src/App.tsx
````typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider } from './contexts/RoleContext';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';
import AgentLayout from './layouts/AgentLayout';
import ClientLayout from './layouts/ClientLayout';

// Client Pages
import ClientLanding from './pages/client/ClientLanding';
import ClientDashboard from './pages/client/ClientDashboard';
import FallbackTicketForm from './pages/client/FallbackTicketForm';

// Agent Pages
import Dashboard from './pages/agent/Dashboard';
import InboundQueue from './pages/agent/InboundQueue';
import TicketDetail from './pages/agent/TicketDetail';
import ClientMasterList from './pages/agent/ClientMasterList';
import ClientDetail from './pages/agent/ClientDetail';
// Project Pages
import ProjectMasterList from './pages/agent/ProjectMasterList';
import ProjectDetail from './pages/agent/ProjectDetail';
import Reports from './pages/agent/Reports';
import TicketReport from './pages/agent/TicketReport';

// KB Pages
import RunbookLibrary from './pages/kb/RunbookLibrary';
import RunbookEditor from './pages/kb/RunbookEditor';
import ReviewQueue from './pages/kb/ReviewQueue';
import AutoDraftDetail from './pages/kb/AutoDraftDetail';

// Analytics Pages
import AnalyticsOverview from './pages/analytics/AnalyticsOverview';
import TicketAnalytics from './pages/analytics/TicketAnalytics';
import KBAnalytics from './pages/analytics/KBAnalytics';
import EngineerPerformance from './pages/analytics/EngineerPerformance';

// Settings Pages
import SettingsLayout from './pages/settings/SettingsLayout';
import GeneralSettings from './pages/settings/GeneralSettings';
import UserManagement from './pages/settings/UserManagement';
import ServiceCodesSettings from './pages/settings/ServiceCodesSettings';

export default function App() {
  return (
    <RoleProvider>
      <ToastProvider>
        <ModalProvider>
          <BrowserRouter>
            <Routes>
          {/* Client Routes */}
          <Route element={<ClientLayout />}>
            <Route path="/" element={<ClientLanding />} />
            <Route path="/dashboard" element={<ClientDashboard />} />
            <Route path="/submit-ticket" element={<FallbackTicketForm />} />
          </Route>

          {/* Agent/Internal Routes */}
          <Route path="/agent" element={<AgentLayout />}>
            <Route index element={<Navigate to="/agent/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="queue" element={<InboundQueue />} />
            <Route path="ticket/:id" element={<TicketDetail />} />
            <Route path="clients" element={<ClientMasterList />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="projects" element={<ProjectMasterList />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/tickets" element={<TicketReport />} />
            
            {/* KB Routes */}
            <Route path="kb" element={<RunbookLibrary />} />
            <Route path="kb/new" element={<RunbookEditor />} />
            <Route path="kb/edit/:id" element={<RunbookEditor />} />
            <Route path="kb/review" element={<ReviewQueue />} />
            <Route path="kb/auto-draft/:id" element={<AutoDraftDetail />} />

            {/* Analytics Routes */}
            <Route path="analytics" element={<AnalyticsOverview />} />
            <Route path="analytics/tickets" element={<TicketAnalytics />} />
            <Route path="analytics/kb" element={<KBAnalytics />} />
            <Route path="analytics/performance" element={<EngineerPerformance />} />

            {/* Settings Routes */}
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<GeneralSettings />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="service-codes" element={<ServiceCodesSettings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
        </ModalProvider>
      </ToastProvider>
    </RoleProvider>
  );
}
````

## File: Frontend/src/index.css
````css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}
````

## File: Frontend/src/main.tsx
````typescript
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
````

## File: Frontend/src/vite-env.d.ts
````typescript
/// <reference types="vite/client" />
````

## File: Frontend/.env.example
````
VITE_API_BASE_URL="http://localhost:3001/api"
VITE_WIDGET_KEY="widget_warehouse_portal"
````

## File: Frontend/.gitignore
````
node_modules/
build/
dist/
coverage/
.DS_Store
*.log
.env*
!.env.example
````

## File: Frontend/backend_spec_v2.md
````markdown
# ATC Support Backend — Final Specification (v2)

## Overview

Backend for a small IT consultancy's support platform. The **core product is a chat widget** embedded in each client project's website. The widget provides **3 layers of support**:

1. **FAQs** (static, non-AI) — project-specific
2. **Julia AI** (LLM chat using that project's KB + docs as context)
3. **Human escalation** (creates a ticket for SE/PL to resolve)

Internally, a **Support Engineer** triages all tickets and **Project Leads** handle escalations for their own projects.

---

## Team Structure

| Role | Count | Responsibility |
|---|---|---|
| **Project Manager (PM)** | 1 | Admin — manages clients, projects, users, KB. Does NOT handle tickets. |
| **Project Lead (PL)** | 10–15 | Each owns one project. Handles escalated tickets for their project. |
| **Support Engineer (SE)** | 1 | First responder — sees all tickets, resolves or escalates to PL. |

---

## Human-Readable IDs

All entities use **auto-increment integers** with human-readable prefixes for display:

| Entity | Format | Example |
|---|---|---|
| Client | `CLT-001` | CLT-042 |
| Project | `PRJ-001` | PRJ-007 |
| Ticket | `TKT-001` | TKT-1234 |
| User | `USR-001` | USR-003 |
| Runbook | `RB-001` | RB-015 |
| AMC | `AMC-001` | AMC-008 |

> [!NOTE]
> DB stores integer `id`. The prefix is generated at display time (API response or frontend). No UUIDs anywhere.

---

## Roles & Permissions

| Resource | Project Manager | Project Lead | Support Engineer |
|---|---|---|---|
| **Clients + Sub-data** | CRUD | Read | Read |
| **Projects** | CRUD | Read (own) | Read |
| **Project Docs** | CRUD | CRUD (own project) | CRUD |
| **KB (Runbooks)** | CRUD | CRUD | CRUD |
| **FAQs** | CRUD | CRUD (own project) | CRUD |
| **Users** | CRUD | Read | Read |
| **Tickets** | Read | Read + Update (own project) | Read + Update (any) |
| **Ticket Messages** | Read | Create + Read (own project) | Create + Read |
| **Chat Sessions** | Read | Read (own project) | Read |
| **Dashboard** | Global counts | Own project counts | Own counts |

> [!IMPORTANT]
> - **Tickets are NEVER created by any internal role.** They only come from widget escalation.
> - **No ticket deletion** by any role.
> - PM can view tickets/chats but cannot reply or change status.

---

## The Widget — Core Product

### How It Works

Each **project** gets a unique **widget key** (generated when project is created). The client embeds a `<script>` tag with this key on their website. The widget is project-scoped — FAQs and Julia AI only use **that project's** runbooks + project docs as context.

### 3-Layer Support Flow

```
Client opens widget
       │
       ▼
 LAYER 1: FAQs (static, non-AI)
 Show project-specific FAQ list
       │
       ├── FAQ resolves issue → Done ✅
       │
       ▼
 LAYER 2: Julia AI Chat
 Client types question → Julia AI responds
 (uses project's KB + docs as context)
 Chat history is ALWAYS recorded
       │
       ├── Julia resolves issue → Done ✅
       │
       ▼
 LAYER 3: Escalate to Human
 Client clicks "Talk to a human"
 → Ticket is created (linked to chat session)
 → SE sees it in queue
```

### What Gets Collected

| Data | When | Stored In |
|---|---|---|
| **Chat session** | Every Julia AI conversation | `chat_sessions` + `chat_messages` |
| **Ticket** | Only on escalation | `tickets` + `ticket_messages` |
| **Client identity** | When they start chatting | `chat_sessions` (name, email) |

> [!NOTE]
> Feedback/ratings are **out of scope** for now. Can be added later.

---

## Ticket Flow (Post-Escalation)

```
Widget escalates → Ticket created (status: NEW)
                   Chat session linked to ticket
        │
        ▼
  SE sees it in Inbound Queue
        │
        ├── SE assigns to self → ASSIGNED → works → RESOLVED ✅
        │
        └── SE escalates → assigned_to changes to PL
                                │
                                └── PL works → RESOLVED ✅
```

### Ticket Statuses
```
NEW → ASSIGNED → IN_PROGRESS → RESOLVED
                      │
                      └── ESCALATED → IN_PROGRESS → RESOLVED
```

---

## Database Schema (~14 tables)

> [!NOTE]
> Columns listed are **core/minimal**. They will evolve over time. Keep the schema lean — don't over-engineer fields that aren't needed today.

```
users
  id (int, auto), name, email, password_hash, role (PM|PL|SE), status, created_at

clients
  id (int, auto), name, industry, status, created_at

client_contacts
  id, client_id (FK), name, email, phone, designation

consignees
  id, client_id (FK), name, address

consignee_contacts
  id, consignee_id (FK), name, email, phone, designation

amcs
  id, client_id (FK), project_id (FK), hours_included, hours_used, start_date, end_date, status

projects
  id (int, auto), client_id (FK), assigned_to (FK → users.id → the PL),
  name, description, widget_key (unique, auto-generated), status, created_at

tickets
  id (int, auto), project_id (FK), chat_session_id (FK, nullable),
  title, description, priority (LOW|MEDIUM|HIGH|CRITICAL),
  status (NEW|ASSIGNED|IN_PROGRESS|ESCALATED|RESOLVED),
  assigned_to (FK → users.id, nullable), created_at, resolved_at

ticket_messages
  id, ticket_id (FK), user_id (FK, nullable for system), content,
  type (REPLY|INTERNAL_NOTE|SYSTEM), created_at

chat_sessions
  id, project_id (FK), client_name, client_email,
  status (ACTIVE|ENDED|ESCALATED), created_at, ended_at

chat_messages
  id, chat_session_id (FK), role (USER|JULIA), content, created_at

faqs
  id, project_id (FK), question, answer, sort_order, created_at

runbooks
  id (int, auto), title, content (markdown), category,
  created_by (FK), created_at, updated_at

project_docs
  id, project_id (FK), title, content (markdown),
  created_by (FK), created_at, updated_at
```

---

## API Endpoints

### Auth (2)
```
POST   /api/auth/login              → { email, password } → { token, user }
GET    /api/auth/me                 → current user from token
```

---

### Widget — Public (identified by widget_key, no JWT) (5)
```
GET    /api/widget/:widgetKey/faqs           → project-specific FAQ list
POST   /api/widget/:widgetKey/chat/start     → start session → { sessionId }
POST   /api/widget/:widgetKey/chat/message   → { sessionId, message } → Julia AI response
POST   /api/widget/:widgetKey/escalate       → { sessionId, name, email, title } → creates ticket
GET    /api/widget/:widgetKey/chat/:sessionId → get chat history (for resuming)
```

> [!IMPORTANT]
> Widget endpoints use `widget_key` (not project ID) to prevent exposing internal IDs. Julia AI scopes its context to that project's runbooks + project docs only.

---

### Users (4) — PM only for CUD
```
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

### Clients (4) — PM only for CUD
```
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PATCH  /api/clients/:id
DELETE /api/clients/:id
```

### Client Contacts (4) — PM only for CUD
```
GET    /api/clients/:id/contacts
POST   /api/clients/:id/contacts
PATCH  /api/contacts/:id
DELETE /api/contacts/:id
```

### Consignees (4) — PM only for CUD
```
GET    /api/clients/:id/consignees
POST   /api/clients/:id/consignees
PATCH  /api/consignees/:id
DELETE /api/consignees/:id
```

### Consignee Contacts (4) — PM only for CUD
```
GET    /api/consignees/:id/contacts
POST   /api/consignees/:id/contacts
PATCH  /api/consignee-contacts/:id
DELETE /api/consignee-contacts/:id
```

### AMCs (4) — PM only for CUD
```
GET    /api/clients/:id/amcs
POST   /api/clients/:id/amcs
PATCH  /api/amcs/:id
DELETE /api/amcs/:id
```

### Projects (4) — PM only for CUD
```
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects               → auto-generates widget_key
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

---

### Tickets (4) — Widget creates, SE/PL update
```
GET    /api/tickets                 → SE: all, PL: own project, PM: all (read-only)
GET    /api/tickets/:id             → detail with messages + linked chat session
POST   /api/tickets                 → ** WIDGET ONLY ** (called via escalate endpoint)
PATCH  /api/tickets/:id             → assign, change status, escalate
```

### Ticket Messages (2) — SE/PL only
```
GET    /api/tickets/:id/messages
POST   /api/tickets/:id/messages    → reply or internal note
```

### Chat Sessions (2) — Read-only for internal users
```
GET    /api/chat-sessions           → PL: own project, PM: all
GET    /api/chat-sessions/:id       → session detail with all messages
```

---

### FAQs (4) — Per-project, CRUD by all roles
```
GET    /api/projects/:id/faqs
POST   /api/projects/:id/faqs
PATCH  /api/faqs/:id
DELETE /api/faqs/:id
```

### Runbooks / KB (4) — Global, CRUD by all roles
```
GET    /api/runbooks
GET    /api/runbooks/:id
POST   /api/runbooks
PATCH  /api/runbooks/:id
DELETE /api/runbooks/:id
```

### Project Docs (4) — Per-project, CRUD by all roles
```
GET    /api/projects/:id/docs
POST   /api/projects/:id/docs
PATCH  /api/docs/:id
DELETE /api/docs/:id
```

---

### Dashboard (1)
```
GET    /api/dashboard/stats
```

**Returns (counts only):**
- **PM**: total clients, total projects, total open tickets, total resolved tickets, total runbooks
- **PL**: open tickets (my project), resolved tickets (my project), total docs + FAQs (my project)
- **SE**: unassigned tickets, my open tickets, my resolved tickets

### Reports (1)
```
GET    /api/reports/tickets         → filters: date range, project, status
```

---

## Summary

| | Count |
|---|---|
| **Tables** | 14 |
| **API Endpoints** | 53 |
| **Roles** | 3 |
| **Widget Endpoints** | 5 (public, no JWT) |
| **Complex Logic** | Ticket escalation + Julia AI context scoping |
| **IDs** | Integer auto-increment, human-readable prefixes on display |

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Validation | Zod |
| AI | Gemini API (for Julia, called server-side with project-scoped context) |

## Out of Scope (For Now)

- ❌ Feedback / ratings
- ❌ AI-generated runbooks
- ❌ Integrations (Slack, Jira, etc.)
- ❌ File attachments
- ❌ Multiple SEs / load balancing
- ❌ Average/historical metrics
- ❌ SLA tracking
- ❌ Service codes / billing
````

## File: Frontend/implementation_plan.md
````markdown
# ATC Support Backend — Implementation Plan

> Reference: [backend_spec.md](file:///C:/Users/josep/.gemini/antigravity/brain/23b12261-2f45-4296-97c3-3a5fbb9a0616/backend_spec.md) for full specification.

## Project Location

New directory: `c:\Users\josep\Desktop\ATC_Support_Backend\`

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | LTS (20+) |
| Framework | Express | 4.x |
| Database | PostgreSQL | 15+ (local install required) |
| ORM | Prisma | Latest |
| Auth | JWT (jsonwebtoken) + bcrypt | — |
| Validation | Zod | — |
| AI | @google/genai (Gemini API) | — |
| Dev | tsx (for running TS directly), nodemon | — |

## Folder Structure

```
ATC_Support_Backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── index.ts                  (Express app entry)
│   ├── config/
│   │   └── env.ts                (env vars, JWT secret, Gemini key)
│   ├── middleware/
│   │   ├── auth.ts               (JWT verify, attach user to req)
│   │   ├── role.ts               (requireRole('PM', 'PL', 'SE'))
│   │   └── validate.ts           (Zod schema validation middleware)
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── clients.ts
│   │   ├── clientContacts.ts
│   │   ├── consignees.ts
│   │   ├── consigneeContacts.ts
│   │   ├── amcs.ts
│   │   ├── projects.ts
│   │   ├── tickets.ts
│   │   ├── ticketMessages.ts
│   │   ├── runbooks.ts
│   │   ├── projectDocs.ts
│   │   ├── faqs.ts
│   │   ├── chatSessions.ts
│   │   ├── widget.ts             (public endpoints, no JWT)
│   │   ├── dashboard.ts
│   │   └── reports.ts
│   ├── services/
│   │   └── julia.ts              (Gemini AI — context builder + chat)
│   └── utils/
│       ├── idPrefix.ts           (CLT-001 display formatting)
│       └── widgetKey.ts          (generate unique widget keys)
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Phase 1: Foundation

### 1.1 Project Initialization
- `npm init`, install dependencies (express, prisma, @prisma/client, jsonwebtoken, bcrypt, zod, cors, @google/genai, dotenv)
- Dev deps: typescript, tsx, @types/*, nodemon
- `tsconfig.json` setup
- `.env` with `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`

### 1.2 Prisma Schema (All 14 Tables)
- [NEW] `prisma/schema.prisma` — all models from spec
- Enums: `Role (PM, PL, SE)`, `TicketStatus (NEW, ASSIGNED, IN_PROGRESS, ESCALATED, RESOLVED)`, `TicketPriority (LOW, MEDIUM, HIGH, CRITICAL)`, `ChatSessionStatus (ACTIVE, ENDED, ESCALATED)`, `MessageType (REPLY, INTERNAL_NOTE, SYSTEM)`, `ChatRole (USER, JULIA)`
- Relations: client → contacts, consignees; consignee → contacts; client → AMCs, projects; project → tickets, docs, FAQs, chat_sessions; ticket → messages, chat_session
- Run `npx prisma migrate dev` to create DB

### 1.3 Express Server Setup
- [NEW] `src/index.ts` — Express app, cors, JSON body parser, route mounting, error handler
- [NEW] `src/config/env.ts` — read env vars with defaults

### 1.4 Auth System
- [NEW] `src/middleware/auth.ts` — JWT verification, attaches `req.user`
- [NEW] `src/middleware/role.ts` — `requireRole(...roles)` middleware
- [NEW] `src/middleware/validate.ts` — Zod middleware factory
- [NEW] `src/routes/auth.ts` — `POST /login`, `GET /me`

### 1.5 Seed Script
- [NEW] `prisma/seed.ts` — creates 1 PM, 1 SE, 3-5 PLs, sample clients/projects/tickets
- Configured in `package.json` under `prisma.seed`

---

## Phase 2: Core CRUD

All follow the same pattern: route file + Zod schemas + role-guarded handlers.

### 2.1 Users CRUD
- [NEW] `src/routes/users.ts` — GET (all), POST, PATCH, DELETE — PM only for CUD

### 2.2 Clients CRUD
- [NEW] `src/routes/clients.ts` — GET (list + detail), POST, PATCH, DELETE — PM only for CUD

### 2.3 Client Sub-entities
- [NEW] `src/routes/clientContacts.ts` — scoped under `/clients/:id/contacts`
- [NEW] `src/routes/consignees.ts` — scoped under `/clients/:id/consignees`
- [NEW] `src/routes/consigneeContacts.ts` — scoped under `/consignees/:id/contacts`
- [NEW] `src/routes/amcs.ts` — scoped under `/clients/:id/amcs`
- All PM-only for CUD

### 2.4 Projects CRUD
- [NEW] `src/routes/projects.ts` — auto-generates `widget_key` on create
- [NEW] `src/utils/widgetKey.ts` — generates unique alphanumeric key
- PL sees own project, PM sees all

### 2.5 Knowledge Base & Docs
- [NEW] `src/routes/runbooks.ts` — global KB, CRUD by all roles
- [NEW] `src/routes/projectDocs.ts` — scoped under `/projects/:id/docs`, CRUD by all
- [NEW] `src/routes/faqs.ts` — scoped under `/projects/:id/faqs`, CRUD by all

### 2.6 Dashboard & Reports
- [NEW] `src/routes/dashboard.ts` — `GET /dashboard/stats` — role-aware count queries
- [NEW] `src/routes/reports.ts` — `GET /reports/tickets` — filtered ticket list
- [NEW] `src/utils/idPrefix.ts` — helper to format `id: 42` → `"TKT-042"`

---

## Phase 3: Widget & Julia AI

### 3.1 Widget Public Endpoints
- [NEW] `src/routes/widget.ts` — no JWT middleware, identified by `widget_key`
  - `GET /:widgetKey/faqs` — return project's FAQs
  - `POST /:widgetKey/chat/start` — create chat session, return sessionId
  - `POST /:widgetKey/chat/message` — send message, get Julia AI response
  - `POST /:widgetKey/escalate` — create ticket from chat, link session
  - `GET /:widgetKey/chat/:sessionId` — retrieve chat history

### 3.2 Julia AI Service
- [NEW] `src/services/julia.ts`
  - Fetches project's runbooks + project docs from DB
  - Builds system prompt with project context
  - Calls Gemini API with conversation history
  - Returns AI response

### 3.3 Chat Sessions (Internal Read-Only)
- [NEW] `src/routes/chatSessions.ts` — `GET /chat-sessions` (PL: own project, PM: all), `GET /chat-sessions/:id`

---

## Phase 4: Ticket Handling

### 4.1 Tickets
- [NEW] `src/routes/tickets.ts`
  - `GET /tickets` — role-filtered (SE: all, PL: own project, PM: all read-only)
  - `GET /tickets/:id` — detail with messages + linked chat session
  - `POST /tickets` — internal route called by widget escalation only
  - `PATCH /tickets/:id` — assign to self, change status, escalate

### 4.2 Ticket Messages
- [NEW] `src/routes/ticketMessages.ts`
  - `GET /tickets/:id/messages`
  - `POST /tickets/:id/messages` — reply or internal note (SE/PL only)

### 4.3 Escalation Logic
- In `PATCH /tickets/:id`: when `status` → `ESCALATED`:
  - Look up `ticket.project.assigned_to` (the PL)
  - Set `ticket.assigned_to = PL's user_id`
  - Set `ticket.status = ESCALATED`

---

## Verification Plan

### Automated (via manual API testing with seed data)

After each phase, verify by running the server and hitting endpoints:

```bash
# Start server
npm run dev

# Phase 1: Auth
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"pm@atc.com","password":"password"}'
# Should return { token, user }

# Phase 2: CRUD (use token from above)
curl http://localhost:3000/api/clients -H "Authorization: Bearer <token>"
# Should return client list from seed data

# Phase 3: Widget
curl http://localhost:3000/api/widget/<widget_key>/faqs
# Should return FAQs for that project

# Phase 4: Tickets
curl http://localhost:3000/api/tickets -H "Authorization: Bearer <SE_token>"
# Should return all tickets
```

### Manual Verification (with the frontend)
1. Start backend on port 3000 (or configured port)
2. Update frontend to make API calls instead of hardcoded data
3. Test full flow: widget chat → escalation → ticket appears in SE queue → assign → resolve

### Role Permission Testing
- Try CUD operations on clients with SE token → should get 403
- Try ticket update with PM token → should get 403
- Try accessing another PL's project tickets → should get empty or 403

> [!IMPORTANT]
> **PostgreSQL must be installed and running locally** before Phase 1. User should confirm they have PostgreSQL available, or we can use SQLite for dev (Prisma supports both with a one-line change).
````

## File: Frontend/index.html
````html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Google AI Studio App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
````

## File: Frontend/metadata.json
````json
{
  "name": "ATC_Support_Frontend",
  "description": "ATC_Support Frontend designed from wireframe html files generated by Stitch.",
  "requestFramePermissions": []
}
````

## File: Frontend/package.json
````json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^1.29.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "better-sqlite3": "^12.4.1",
    "clsx": "^2.1.1",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.13.1",
    "react-signature-canvas": "^1.1.0-alpha.2",
    "recharts": "^3.8.0",
    "tailwind-merge": "^3.5.0",
    "vite": "^6.2.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@types/react-signature-canvas": "^1.0.7",
    "autoprefixer": "^10.4.21",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
````

## File: Frontend/README.md
````markdown
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fe418637-b6bc-4155-80b3-ef8a0f685d11

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
````

## File: Frontend/task.md
````markdown
# ATC Support Backend — Task List

## Phase 1: Foundation
- [ ] Initialize Node.js project (`npm init`, install deps, `tsconfig.json`)
- [ ] Create `.env` with `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`
- [ ] Write Prisma schema (14 tables, all enums, all relations)
- [ ] Run `prisma migrate dev` to create database
- [ ] Build Express server entry (`src/index.ts` — cors, JSON, error handler)
- [ ] Build env config (`src/config/env.ts`)
- [ ] Build auth middleware (JWT verify, role check, Zod validate)
- [ ] Build auth routes (`POST /login`, `GET /me`)
- [ ] Write seed script (1 PM, 1 SE, 3-5 PLs, sample data)
- [ ] Verify: login and `/me` works with seeded users

## Phase 2: Core CRUD
- [ ] Users CRUD (`/api/users`) — PM only for CUD
- [ ] Clients CRUD (`/api/clients`) — PM only for CUD
- [ ] Client Contacts (`/api/clients/:id/contacts`) — PM only for CUD
- [ ] Consignees (`/api/clients/:id/consignees`) — PM only for CUD
- [ ] Consignee Contacts (`/api/consignees/:id/contacts`) — PM only for CUD
- [ ] AMCs (`/api/clients/:id/amcs`) — PM only for CUD
- [ ] Projects CRUD (`/api/projects`) — auto-gen `widget_key`, PM only for CUD
- [ ] Runbooks CRUD (`/api/runbooks`) — all roles
- [ ] Project Docs CRUD (`/api/projects/:id/docs`) — all roles
- [ ] FAQs CRUD (`/api/projects/:id/faqs`) — all roles
- [ ] Dashboard stats (`/api/dashboard/stats`) — role-aware counts
- [ ] Reports (`/api/reports/tickets`) — filtered ticket list
- [ ] ID prefix utility (`idPrefix.ts`) for human-readable IDs
- [ ] Verify: all CRUD endpoints with role permissions

## Phase 3: Widget & Julia AI
- [ ] Widget FAQ endpoint (`GET /api/widget/:widgetKey/faqs`)
- [ ] Widget chat start (`POST /api/widget/:widgetKey/chat/start`)
- [ ] Julia AI service (`src/services/julia.ts` — context builder + Gemini call)
- [ ] Widget chat message (`POST /api/widget/:widgetKey/chat/message`)
- [ ] Widget escalation (`POST /api/widget/:widgetKey/escalate` — creates ticket)
- [ ] Widget chat history (`GET /api/widget/:widgetKey/chat/:sessionId`)
- [ ] Chat sessions read-only for internal (`/api/chat-sessions`)
- [ ] Verify: full widget flow — FAQs → AI chat → escalation creates ticket

## Phase 4: Ticket Handling
- [ ] Ticket listing (`GET /api/tickets`) — role-filtered
- [ ] Ticket detail (`GET /api/tickets/:id`) — with messages + chat session
- [ ] Ticket update (`PATCH /api/tickets/:id`) — assign, status change
- [ ] Escalation logic — auto-assigns to PL on escalate
- [ ] Ticket messages (`GET/POST /api/tickets/:id/messages`)
- [ ] Verify: SE assigns ticket → resolves OR escalates → PL resolves

## Final
- [ ] Full integration test: widget → ticket → SE → PL → resolved
- [ ] Permission matrix test: wrong role gets 403 on restricted endpoints
````

## File: Frontend/tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
````

## File: Frontend/vite.config.ts
````typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
````
