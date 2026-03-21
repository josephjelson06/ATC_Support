import { Suspense, lazy } from 'react';
import type { ReactElement } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';

import { ModalProvider } from './contexts/ModalContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { ToastProvider } from './contexts/ToastContext';
import SectionRouteLayout from './layouts/SectionRouteLayout';
import {
  adminPrimaryTabs,
  analyticsTabs,
  appPaths,
  knowledgeBaseTabs,
  reportTabs,
  settingsTabs,
  userAccessTabs,
} from './lib/navigation';

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

const GeneralSettings = lazy(() => import('./pages/settings/GeneralSettings'));
const UserManagement = lazy(() => import('./pages/settings/UserManagement'));
const ServiceCodesSettings = lazy(() => import('./pages/settings/ServiceCodesSettings'));
const AccountPage = lazy(() => import('./pages/settings/AccountPage'));
const RoleDirectory = lazy(() => import('./pages/settings/RoleDirectory'));
const PermissionMatrix = lazy(() => import('./pages/settings/PermissionMatrix'));
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'));
const EmailSettings = lazy(() => import('./pages/settings/EmailSettings'));
const WidgetDefaultsSettings = lazy(() => import('./pages/settings/WidgetDefaultsSettings'));
const JuliaDefaultsSettings = lazy(() => import('./pages/settings/JuliaDefaultsSettings'));
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'));
const Integrations = lazy(() => import('./pages/settings/Integrations'));

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

function LegacyTicketRedirect() {
  const { id } = useParams();
  return <Navigate to={appPaths.tickets.detail(id || '')} replace />;
}

function LegacyRunbookEditRedirect() {
  const { id } = useParams();
  return <Navigate to={appPaths.kb.edit(id || '')} replace />;
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
            <Route path="queue" element={<Navigate to={appPaths.tickets.queue} replace />} />
            <Route path="ticket/:id" element={<LegacyTicketRedirect />} />

            <Route
              path="tickets"
              element={<SectionRouteLayout breadcrumbs={[{ label: 'Operations' }, { label: 'Tickets' }]} />}
            >
              <Route index element={<Navigate to="queue" replace />} />
              <Route path="queue" element={<InboundQueue />} />
              <Route path="mine" element={<InboundQueue />} />
              <Route path="escalated" element={<InboundQueue />} />
              <Route path="waiting" element={<InboundQueue />} />
              <Route path="resolved" element={<InboundQueue />} />
              <Route path=":id" element={<Navigate to="summary" replace />} />
              <Route path=":id/:tab" element={<TicketDetail />} />
            </Route>

            <Route path="clients" element={<ClientMasterList />} />
            <Route path="clients/:id" element={<Navigate to="overview" replace />} />
            <Route path="clients/:id/:tab" element={<ClientDetail />} />

            <Route path="projects" element={<ProjectMasterList />} />
            <Route path="projects/:id" element={<Navigate to="overview" replace />} />
            <Route path="projects/:id/:tab" element={<ProjectDetail />} />

            <Route path="reports" element={<Navigate to={appPaths.reports.overview} replace />} />
            <Route
              path="reports"
              element={<SectionRouteLayout breadcrumbs={[{ label: 'Insights' }, { label: 'Reports' }]} tabs={reportTabs} />}
            >
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<Reports />} />
              <Route path="tickets" element={<TicketReport />} />
            </Route>

            <Route path="kb" element={<Navigate to={appPaths.kb.library} replace />} />
            <Route
              path="kb"
              element={<SectionRouteLayout breadcrumbs={[{ label: 'Operations' }, { label: 'Knowledge Base' }]} tabs={knowledgeBaseTabs} />}
            >
              <Route index element={<Navigate to="library" replace />} />
              <Route path="library" element={<RunbookLibrary />} />
              <Route path="review" element={<ReviewQueue />} />
              <Route path="auto-drafts" element={<ReviewQueue />} />
              <Route path="new" element={<RunbookEditor />} />
              <Route path="edit/:id" element={<LegacyRunbookEditRedirect />} />
              <Route path=":id/edit" element={<RunbookEditor />} />
              <Route path="auto-draft/:id" element={<AutoDraftDetail />} />
            </Route>

            <Route path="analytics" element={<Navigate to={appPaths.analytics.overview} replace />} />
            <Route
              path="analytics"
              element={<SectionRouteLayout breadcrumbs={[{ label: 'Insights' }, { label: 'Analytics' }]} tabs={analyticsTabs} />}
            >
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AnalyticsOverview />} />
              <Route path="tickets" element={<TicketAnalytics />} />
              <Route path="kb" element={<KBAnalytics />} />
              <Route path="performance" element={<EngineerPerformance />} />
            </Route>

            <Route path="settings" element={<Navigate to={appPaths.admin.settings.general} replace />} />
            <Route path="settings/users" element={<Navigate to={appPaths.admin.users} replace />} />
            <Route path="settings/service-codes" element={<Navigate to={appPaths.admin.masters.serviceCodes} replace />} />

            <Route path="account" element={<AccountPage />} />

            <Route
              path="admin"
              element={<SectionRouteLayout breadcrumbs={[{ label: 'Administration' }]} tabs={adminPrimaryTabs} />}
            >
              <Route index element={<Navigate to="users" replace />} />

              <Route
                element={<SectionRouteLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Users & Access' }]} tabs={userAccessTabs} />}
              >
                <Route path="users" element={<UserManagement />} />
                <Route path="roles" element={<RoleDirectory />} />
                <Route path="permissions" element={<PermissionMatrix />} />
              </Route>

              <Route path="masters/service-codes" element={<ServiceCodesSettings />} />

              <Route
                path="settings"
                element={<SectionRouteLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]} tabs={settingsTabs} />}
              >
                <Route index element={<Navigate to="general" replace />} />
                <Route path="general" element={<GeneralSettings />} />
                <Route path="notifications" element={<NotificationSettings />} />
                <Route path="email" element={<EmailSettings />} />
                <Route path="widget" element={<WidgetDefaultsSettings />} />
                <Route path="julia" element={<JuliaDefaultsSettings />} />
                <Route path="security" element={<SecuritySettings />} />
                <Route path="integrations" element={<Integrations />} />
              </Route>
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
