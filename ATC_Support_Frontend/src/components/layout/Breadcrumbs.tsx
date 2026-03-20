import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { BreadcrumbItem } from '../../lib/navigation';

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-300" /> : null}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-slate-600">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-500">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
