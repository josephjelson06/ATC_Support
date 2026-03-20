import type { LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

type SidebarGroupItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  matchPrefixes?: string[];
};

export default function SidebarGroup({ label, items }: { label: string; items: SidebarGroupItem[] }) {
  const location = useLocation();

  return (
    <div className="space-y-2">
      <p className="px-3 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const isManuallyActive = item.matchPrefixes?.some((prefix) => location.pathname.startsWith(prefix)) ?? false;

          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors',
                  isActive || isManuallyActive ? 'bg-orange-50 text-orange-700' : 'text-slate-600 hover:bg-slate-50',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
