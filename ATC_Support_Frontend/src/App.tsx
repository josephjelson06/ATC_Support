import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';
import AgentLayout from './layouts/AgentLayout';
import ClientLayout from './layouts/ClientLayout';

import LoginPage from './pages/auth/LoginPage';

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

function RequireAuth() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          <h1 className="text-xl font-bold text-slate-900 mt-4">Restoring session</h1>
          <p className="text-sm text-slate-500 mt-2">Checking your account before opening the agent console.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function PublicOnlyRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/agent/dashboard" replace /> : children;
}

export default function App() {
  return (
    <RoleProvider>
      <ToastProvider>
        <ModalProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

              {/* Client Routes */}
              <Route element={<ClientLayout />}>
                <Route path="/" element={<ClientLanding />} />
                <Route path="/dashboard" element={<ClientDashboard />} />
                <Route path="/submit-ticket" element={<FallbackTicketForm />} />
              </Route>

              {/* Agent/Internal Routes */}
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
              </Route>
            </Routes>
          </BrowserRouter>
        </ModalProvider>
      </ToastProvider>
    </RoleProvider>
  );
}
