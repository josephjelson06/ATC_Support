import type { ChangeEvent, ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

export function DataToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filtersOpen,
  onToggleFilters,
  activeFilterCount = 0,
  children,
  className,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount?: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex items-center gap-3 p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-all focus:border-orange-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <button
          type="button"
          onClick={onToggleFilters}
          aria-pressed={filtersOpen}
          aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
          className={clsx(
            'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors',
            filtersOpen ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <SlidersHorizontal className={clsx('h-5 w-5 transition-transform duration-300 ease-out', filtersOpen && 'rotate-180')} />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-black text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {children ? (
        <div
          aria-hidden={!filtersOpen}
          className={clsx(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
            filtersOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0',
          )}
        >
          <div className={clsx('min-h-0 overflow-hidden', filtersOpen && 'border-t border-slate-100')}>
            <div className="p-4 pt-4">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DataFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}
