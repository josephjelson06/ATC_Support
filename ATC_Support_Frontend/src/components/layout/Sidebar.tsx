import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';

import { useRole } from '../../contexts/RoleContext';
import { useShell } from '../../contexts/ShellContext';
import { getVisibleSidebarGroups } from '../../lib/navigation';
import SidebarGroup from './SidebarGroup';

export default function Sidebar({
  collapsed = false,
  mobile = false,
  onClose,
  className,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const { backendRole } = useRole();
  const { toggleSidebarCollapsed } = useShell();
  const sidebarGroups = getVisibleSidebarGroups(backendRole);

  return (
    <aside
      className={clsx(
        'flex h-full flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200',
        mobile ? 'w-[18rem]' : collapsed ? 'w-20' : 'w-72',
        className,
      )}
    >
      <div
        className={clsx(
          'border-b border-slate-100',
          mobile ? 'p-6' : collapsed ? 'px-3 py-5' : 'p-6',
        )}
      >
        <div className={clsx('flex items-center', mobile || !collapsed ? 'gap-3' : 'flex-col gap-4')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
            <span className="text-lg font-bold">J</span>
          </div>
          {!collapsed || mobile ? (
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight">ATC Support</h1>
              <p className="text-xs text-slate-500">Operations Console</p>
            </div>
          ) : null}

          {mobile ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className={clsx('flex-1 space-y-6 overflow-y-auto', collapsed && !mobile ? 'p-3' : 'p-4')}>
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.id} label={group.label} items={group.items} collapsed={collapsed && !mobile} onNavigate={onClose} />
        ))}
      </nav>

      {!mobile ? (
        <div className={clsx('border-t border-slate-100', collapsed ? 'px-2 py-3' : 'p-4')}>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={clsx(
              'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700',
              collapsed ? 'mx-auto' : 'ml-auto',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
