import { useState } from 'react';
import { KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';

export default function AccountPage() {
  const { user, backendRole, changePassword } = useRole();
  const { showToast } = useToast();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const updateField =
    (field: keyof typeof passwordForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setPasswordForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast('warning', 'Enter your current password and a new password.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('warning', 'New password and confirmation do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('warning', 'New password must be at least 6 characters.');
      return;
    }

    setIsUpdating(true);

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showToast('success', 'Password updated successfully.');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Unable to update the password right now.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <PageHeader
        title="My Profile"
        description="Personal account details and security controls live here instead of the main sidebar."
        breadcrumbs={[
          { label: 'Account' },
          { label: 'Profile' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-black uppercase tracking-[0.28em] text-slate-500">Profile</h2>
          </div>
          <div className="space-y-4 p-6">
            <ProfileRow icon={UserRound} label="Name" value={user?.name || 'Unknown user'} />
            <ProfileRow icon={Mail} label="Email" value={user?.email || 'Unknown email'} />
            <ProfileRow icon={ShieldCheck} label="Role" value={backendRole || 'Unknown role'} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-black uppercase tracking-[0.28em] text-slate-500">Security</h2>
          </div>
          <div className="space-y-4 p-6">
            <Field label="Current Password">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={updateField('currentPassword')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </Field>
            <Field label="New Password">
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={updateField('newPassword')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={updateField('confirmPassword')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="text-sm text-slate-500">Changing your password refreshes this browser session.</p>
            <button
              onClick={() => void handlePasswordChange()}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <KeyRound className="h-4 w-4" />
              {isUpdating ? 'Updating…' : 'Change Password'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
