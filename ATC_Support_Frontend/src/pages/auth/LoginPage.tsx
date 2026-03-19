import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react';

import { useRole } from '../../contexts/RoleContext';
import { getErrorMessage } from '../../lib/api';

const seededAccounts = [
  { label: 'Project Manager', email: 'pm@atc.com', password: 'password' },
  { label: 'Project Lead', email: 'pl1@atc.com', password: 'password' },
  { label: 'Support Engineer', email: 'se@atc.com', password: 'password' },
];

export default function LoginPage() {
  const location = useLocation();
  const { isAuthenticated, isLoading, login, error } = useRole();
  const [email, setEmail] = useState('pm@atc.com');
  const [password, setPassword] = useState('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTo =
    typeof location.state === 'object' && location.state !== null && 'from' in location.state
      ? String((location.state as { from?: string }).from || '/agent/dashboard')
      : '/agent/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      await login(email, password);
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden rounded-[2rem] border border-orange-100 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:block">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">ATC Support</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-900">Operational support for projects, people, and Julia.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Sign in to manage live client projects, widget escalations, ticket handling, and the shared knowledge base from one console.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {seededAccounts.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:border-orange-200 hover:bg-orange-50"
              >
                <p className="text-sm font-bold text-slate-900">{account.label}</p>
                <p className="mt-2 text-xs text-slate-500">{account.email}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-200">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h2 className="mt-6 text-3xl font-black text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use a seeded ATC account to access the live backend-backed console.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    placeholder="pm@atc.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Password</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    placeholder="password"
                  />
                </div>
              </label>

              {(formError || error) ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError || error}</div> : null}

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                <LogIn className="h-4 w-4" />
                {isSubmitting || isLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Seeded passwords are set to <span className="font-mono font-bold text-slate-900">password</span> for local development.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
