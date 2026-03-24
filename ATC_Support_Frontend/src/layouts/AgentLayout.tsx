import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useRole } from '../contexts/RoleContext';
import { ShellProvider, useShell } from '../contexts/ShellContext';

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
    <ShellProvider>
      <AgentShell />
    </ShellProvider>
  );
}

function AgentShell() {
  const { isDesktop, isSidebarCollapsed, isSidebarOpen, closeSidebar } = useShell();

  useEffect(() => {
    if (isDesktop || !isSidebarOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [closeSidebar, isDesktop, isSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans lg:h-screen lg:overflow-hidden">
      <Sidebar collapsed={isSidebarCollapsed} className="hidden lg:flex" />

      {!isDesktop && isSidebarOpen ? (
        <div className="fixed inset-0 z-[120] lg:hidden" aria-hidden={!isSidebarOpen}>
          <button type="button" aria-label="Close sidebar backdrop" onClick={closeSidebar} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
          <Sidebar mobile onClose={closeSidebar} className="relative z-[121] flex h-full max-w-[18rem] shadow-2xl" />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
