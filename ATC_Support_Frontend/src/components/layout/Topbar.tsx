import { Menu } from 'lucide-react';

import NotificationMenu from './NotificationMenu';
import QuickLookup from './QuickLookup';
import UserMenu from './UserMenu';
import { useRole } from '../../contexts/RoleContext';
import { useShell } from '../../contexts/ShellContext';

export default function Topbar() {
  const { name, designation, user, logout } = useRole();
  const { isDesktop, openSidebar } = useShell();

  return (
    <header className="sticky top-0 z-[90] flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {!isDesktop ? (
          <button
            type="button"
            onClick={openSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <QuickLookup role={user?.role ?? null} variant="desktop" />
        <QuickLookup role={user?.role ?? null} variant="mobile" />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
        <NotificationMenu />
        <UserMenu name={name} designation={designation} onLogout={logout} />
      </div>
    </header>
  );
}
