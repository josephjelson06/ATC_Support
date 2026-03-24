import NotificationMenu from './NotificationMenu';
import QuickLookup from './QuickLookup';
import UserMenu from './UserMenu';
import { useRole } from '../../contexts/RoleContext';

export default function Topbar() {
  const { name, designation, user, logout } = useRole();

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-end border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <QuickLookup role={user?.role ?? null} />
        <NotificationMenu />
        <UserMenu name={name} designation={designation} onLogout={logout} />
      </div>
    </header>
  );
}

