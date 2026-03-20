export default function JuliaDefaultsSettings() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Julia Defaults</h2>
        <p className="mt-1 text-sm text-slate-500">Workspace-level fallback behavior for projects that do not override Julia greeting, fallback, or escalation guidance.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Default Greeting">
          <textarea rows={3} defaultValue="Hi, I’m Julia. I’ll search your project knowledge first and help before escalating." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
        </Field>
        <Field label="Default Fallback Message">
          <textarea rows={3} defaultValue="I don’t have enough confidence to answer that accurately. I can help escalate this to the delivery team." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
        </Field>
        <Field label="Default Escalation Hint">
          <textarea rows={3} defaultValue="If this affects production or needs a human review, choose escalation and we’ll turn this into a tracked ticket." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
