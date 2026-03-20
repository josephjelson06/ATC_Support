export default function WidgetDefaultsSettings() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Widget Defaults</h2>
        <p className="mt-1 text-sm text-slate-500">Baseline widget behavior for new projects before project-level overrides are applied.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Default State" description="New projects should ship with the widget enabled by default." />
        <Card title="Escalation Prompt" description="Use a polite handoff prompt that sets expectations before ticket creation." />
      </div>
    </div>
  );
}

function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
