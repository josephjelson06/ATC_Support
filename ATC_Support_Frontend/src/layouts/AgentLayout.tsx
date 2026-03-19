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
          <h1 className="text-xl font-bold text-slate-900 mt-4">Restoring your session</h1>
          <p className="text-sm text-slate-500 mt-2">Checking authentication and loading live support data.</p>
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
