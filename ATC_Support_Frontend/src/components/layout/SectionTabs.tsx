import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';

import type { BackendRole } from '../../lib/types';
import type { SectionTab } from '../../lib/navigation';

export default function SectionTabs({
  tabs,
  role,
}: {
  tabs: SectionTab[];
  role?: BackendRole | null;
}) {
  const visibleTabs = tabs.filter((tab) => !tab.roles || (role ? tab.roles.includes(role) : false));

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 border-b border-slate-200">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              clsx(
                'border-b-2 px-1 pb-3 pt-1 text-sm font-bold transition-colors',
                isActive ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
