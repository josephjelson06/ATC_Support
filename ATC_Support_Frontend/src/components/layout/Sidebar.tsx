import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';

import { useRole } from '../../contexts/RoleContext';
import { formatRoleLabel } from '../../lib/format';

export default function Sidebar() {
  const location = useLocation();
  const { role, backendRole, name, designation, logout } = useRole();

  const getNavItems = () => {
    const baseItems = [{ name: 'Dashboard', path: '/agent/dashboard', icon: LayoutDashboard }];

    const engineerItems = [
      { name: 'My Projects', path: '/agent/projects', icon: Briefcase },
      { name: 'Tickets', path: '/agent/queue', icon: Ticket },
      { name: 'Knowledge Base', path: '/agent/kb', icon: BookOpen },
    ];

    const managerItems = [
      { name: 'Projects', path: '/agent/projects', icon: Briefcase },
      { name: 'Tickets', path: '/agent/queue', icon: Ticket },
      { name: 'Clients', path: '/agent/clients', icon: Users },
      { name: 'Knowledge Base', path: '/agent/kb', icon: BookOpen },
      { name: 'Reports', path: '/agent/reports', icon: BarChart2 },
      { name: 'Settings', path: '/agent/settings', icon: Settings },
    ];

    if (role === 'Support Engineer' || role === 'Project Lead') {
      return [...baseItems, ...engineerItems];
    }

    return [...baseItems, ...managerItems];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
          <span className="font-bold text-lg">J</span>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">Julia Support</h1>
          <p className="text-xs text-slate-500">Agent Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authenticated Account</p>
          <p className="mt-2 text-sm font-bold text-slate-900">{backendRole ? formatRoleLabel(backendRole) : role}</p>
        </div>

        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
              alt="User"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate">
              {designation}
              {backendRole ? ` • ${formatRoleLabel(backendRole)}` : ''}
            </p>
          </div>
          <button onClick={() => void logout()} className="text-slate-400 hover:text-slate-600" title="Sign out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
