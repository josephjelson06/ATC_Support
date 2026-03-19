import { Search } from 'lucide-react';

import NotificationMenu from './NotificationMenu';
import { useRole } from '../../contexts/RoleContext';

export default function Topbar() {
  const { name, designation, user } = useRole();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{name}</span>
          <span className="text-slate-300">•</span>
          <span className="text-sm text-slate-500">{designation}</span>
          {user?.displayId && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-sm text-slate-400">{user.displayId}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tickets, clients..."
            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-orange-500/50 transition-all outline-none"
          />
        </div>
        <NotificationMenu />
      </div>
    </header>
  );
}
