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

  // Hide the entire strip when there's nothing (or nothing meaningful) to switch between.
  if (visibleTabs.length <= 1) {
    return null;
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="inline-flex min-w-max gap-3 border-b border-slate-200 sm:min-w-full">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              clsx(
                'shrink-0 border-b-2 px-1 pb-3 pt-1 text-sm font-bold transition-colors',
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
