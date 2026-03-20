import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Settings, Users, FileCode } from 'lucide-react';
import { clsx } from 'clsx';
import { appPaths } from '../../lib/navigation';

export default function SettingsLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'General', path: appPaths.admin.settings.general, icon: Settings, exact: true },
    { name: 'User Management', path: appPaths.admin.users, icon: Users },
    { name: 'AMC Coverage', path: appPaths.admin.masters.serviceCodes, icon: FileCode },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your workspace, users, and global configurations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Settings Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
