import type { LucideIcon } from 'lucide-react';

export function StatStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accent?: 'orange' | 'blue' | 'green';
  }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'orange',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
