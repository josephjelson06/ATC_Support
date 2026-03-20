export default function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}
