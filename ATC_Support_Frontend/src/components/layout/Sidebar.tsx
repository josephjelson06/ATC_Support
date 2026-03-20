import { LogOut } from 'lucide-react';

import { useRole } from '../../contexts/RoleContext';
import { formatRoleLabel } from '../../lib/format';
import { getVisibleSidebarGroups } from '../../lib/navigation';
import SidebarGroup from './SidebarGroup';

export default function Sidebar() {
  const { role, backendRole, name, designation, logout } = useRole();
  const sidebarGroups = getVisibleSidebarGroups(backendRole);

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
          <span className="text-lg font-bold">J</span>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">ATC Support</h1>
          <p className="text-xs text-slate-500">Operations Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.id} label={group.label} items={group.items} />
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Authenticated Account</p>
          <p className="mt-2 text-sm font-bold text-slate-900">{backendRole ? formatRoleLabel(backendRole) : role}</p>
        </div>

        <div className="flex items-center gap-3 p-2">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
              alt="User"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">
              {designation}
              {backendRole ? ` • ${formatRoleLabel(backendRole)}` : ''}
            </p>
          </div>
          <button onClick={() => void logout()} className="text-slate-400 transition-colors hover:text-slate-600" title="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
