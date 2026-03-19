import { Suspense, lazy } from 'react';
import type { ReactElement } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { ModalProvider } from './contexts/ModalContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { ToastProvider } from './contexts/ToastContext';

const AgentLayout = lazy(() => import('./layouts/AgentLayout'));
const ClientLayout = lazy(() => import('./layouts/ClientLayout'));

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));

const ClientLanding = lazy(() => import('./pages/client/ClientLanding'));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const FallbackTicketForm = lazy(() => import('./pages/client/FallbackTicketForm'));

const Dashboard = lazy(() => import('./pages/agent/Dashboard'));
const InboundQueue = lazy(() => import('./pages/agent/InboundQueue'));
const TicketDetail = lazy(() => import('./pages/agent/TicketDetail'));
const ClientMasterList = lazy(() => import('./pages/agent/ClientMasterList'));
const ClientDetail = lazy(() => import('./pages/agent/ClientDetail'));
const ProjectMasterList = lazy(() => import('./pages/agent/ProjectMasterList'));
const ProjectDetail = lazy(() => import('./pages/agent/ProjectDetail'));
const Reports = lazy(() => import('./pages/agent/Reports'));
const TicketReport = lazy(() => import('./pages/agent/TicketReport'));

const RunbookLibrary = lazy(() => import('./pages/kb/RunbookLibrary'));
const RunbookEditor = lazy(() => import('./pages/kb/RunbookEditor'));
const ReviewQueue = lazy(() => import('./pages/kb/ReviewQueue'));
const AutoDraftDetail = lazy(() => import('./pages/kb/AutoDraftDetail'));

const AnalyticsOverview = lazy(() => import('./pages/analytics/AnalyticsOverview'));
const TicketAnalytics = lazy(() => import('./pages/analytics/TicketAnalytics'));
const KBAnalytics = lazy(() => import('./pages/analytics/KBAnalytics'));
const EngineerPerformance = lazy(() => import('./pages/analytics/EngineerPerformance'));

const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'));
const GeneralSettings = lazy(() => import('./pages/settings/GeneralSettings'));
const UserManagement = lazy(() => import('./pages/settings/UserManagement'));
const ServiceCodesSettings = lazy(() => import('./pages/settings/ServiceCodesSettings'));

function RequireAuth() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Restoring session</h1>
          <p className="mt-2 text-sm text-slate-500">Checking your account before opening the agent console.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/agent/dashboard" replace /> : children;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Loading workspace</h1>
        <p className="mt-2 text-sm text-slate-500">Fetching the next route chunk so the app can stay lighter on first load.</p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-600">404</p>
        <h1 className="mt-3 text-2xl font-black text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">That route does not exist in ATC Support.</p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/agent/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />

        <Route element={<ClientLayout />}>
          <Route path="/" element={<ClientLanding />} />
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/submit-ticket" element={<FallbackTicketForm />} />
        </Route>

        <Route element={<RequireAuth />}>
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

            <Route path="kb" element={<RunbookLibrary />} />
            <Route path="kb/new" element={<RunbookEditor />} />
            <Route path="kb/edit/:id" element={<RunbookEditor />} />
            <Route path="kb/review" element={<ReviewQueue />} />
            <Route path="kb/auto-draft/:id" element={<AutoDraftDetail />} />

            <Route path="analytics" element={<AnalyticsOverview />} />
            <Route path="analytics/tickets" element={<TicketAnalytics />} />
            <Route path="analytics/kb" element={<KBAnalytics />} />
            <Route path="analytics/performance" element={<EngineerPerformance />} />

            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<GeneralSettings />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="service-codes" element={<ServiceCodesSettings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <ToastProvider>
        <ModalProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ModalProvider>
      </ToastProvider>
    </RoleProvider>
  );
}
