export default function EmailSettings() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Email Defaults</h2>
        <p className="mt-1 text-sm text-slate-500">Operational defaults for outbound ticket email and inbound threading behavior.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          <Field label="Default From Name">
            <input type="text" defaultValue="ATC Support" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          </Field>
          <Field label="Default From Email">
            <input type="email" defaultValue="support@atc.com" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          </Field>
          <Field label="Reply Prefix">
            <input type="text" defaultValue="[ATC Support]" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          </Field>
          <Field label="Inbound Secret">
            <input type="password" defaultValue="webhook-secret" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          </Field>
        </div>
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
