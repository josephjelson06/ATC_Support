import type { ReactNode } from 'react';

import Breadcrumbs from './Breadcrumbs';
import type { BreadcrumbItem } from '../../lib/navigation';

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  badges,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          {badges ? <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
