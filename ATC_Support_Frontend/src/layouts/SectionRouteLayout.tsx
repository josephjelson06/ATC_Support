import { Outlet } from 'react-router-dom';

import { useRole } from '../contexts/RoleContext';
import type { BreadcrumbItem, SectionTab } from '../lib/navigation';
import SectionTabs from '../components/layout/SectionTabs';

export default function SectionRouteLayout({
  breadcrumbs = [],
  tabs = [],
}: {
  breadcrumbs?: BreadcrumbItem[];
  tabs?: SectionTab[];
}) {
  const { backendRole } = useRole();
  const visibleTabs = tabs.filter((tab) => !tab.roles || (backendRole ? tab.roles.includes(backendRole) : false));

  // Breadcrumbs are intentionally disabled across the app; only render a header when we
  // have a real section switcher (2+ visible tabs).
  if (visibleTabs.length <= 1) {
    return <Outlet />;
  }

  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <SectionTabs tabs={tabs} role={backendRole} />
        </div>
      </div>
      <Outlet />
    </>
  );
}
