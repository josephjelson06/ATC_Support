import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { BreadcrumbItem } from '../../lib/navigation';

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto">
      <ol className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {item.to && !isLast ? (
                <Link to={item.to} className="truncate transition-colors hover:text-orange-600">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'truncate text-slate-500' : 'truncate'}>{item.label}</span>
              )}
              {!isLast ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
