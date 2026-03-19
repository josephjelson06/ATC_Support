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
  const { user, backendRole, changePassword } = useRole();
  const [settings, setSettings] = useState<WorkspaceSettings>(() => readStoredSettings(user?.email));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handlePasswordFieldChange =
    (field: keyof typeof passwordForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setPasswordForm((current) => ({
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

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast('warning', 'Enter your current and new password.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('warning', 'New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('warning', 'New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showToast('success', 'Password updated successfully.');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Unable to change password right now.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">General Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Browser-local workspace preferences plus account security and a live backend connection snapshot.</p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Settings persistence is local for now.</p>
            <p className="mt-1 text-blue-800">
              The current backend spec does not include a workspace settings endpoint, so these values are stored in this browser only.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr,1fr]">
        <div className="space-y-6">
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
                  {[settings.timezone, 'Asia/Calcutta', 'UTC', 'America/New_York', 'Europe/London']
                    .filter((value, index, values) => values.indexOf(value) === index)
                    .map((value) => (
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

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Account Security</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
              <Field label="Current Password">
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFieldChange('currentPassword')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                />
              </Field>
              <Field label="New Password">
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFieldChange('newPassword')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordFieldChange('confirmPassword')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <p className="text-sm text-slate-500">Changing your password rotates the active access token for this browser session.</p>
              <button
                onClick={() => void handleChangePassword()}
                disabled={isChangingPassword}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isChangingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </section>
        </div>

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
              <p className="mt-4 text-sm text-slate-500">Loading live counts...</p>
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
