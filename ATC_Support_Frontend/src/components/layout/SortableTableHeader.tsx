import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { SortDirection } from '../../lib/tableSort';

export function SortableTableHeader({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: 'left' | 'right' | 'center';
}) {
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-2 transition-colors hover:text-slate-700',
        active ? 'text-slate-700' : 'text-slate-500',
        align === 'right' && 'ml-auto',
        align === 'center' && 'mx-auto',
      )}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
