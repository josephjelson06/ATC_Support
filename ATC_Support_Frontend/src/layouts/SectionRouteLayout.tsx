import { Outlet } from 'react-router-dom';

import { useRole } from '../contexts/RoleContext';
import type { BreadcrumbItem, SectionTab } from '../lib/navigation';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionTabs from '../components/layout/SectionTabs';

export default function SectionRouteLayout({
  breadcrumbs = [],
  tabs = [],
}: {
  breadcrumbs?: BreadcrumbItem[];
  tabs?: SectionTab[];
}) {
  const { backendRole } = useRole();

  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl space-y-4 px-6 py-4">
          <Breadcrumbs items={breadcrumbs} />
          <SectionTabs tabs={tabs} role={backendRole} />
        </div>
      </div>
      <Outlet />
    </>
  );
}
