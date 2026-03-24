import { useRole } from '../../contexts/RoleContext';
import { getVisibleSidebarGroups } from '../../lib/navigation';
import SidebarGroup from './SidebarGroup';

export default function Sidebar() {
  const { backendRole } = useRole();
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
    </aside>
  );
}

