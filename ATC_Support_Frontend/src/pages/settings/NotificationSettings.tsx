export default function NotificationSettings() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Notification Defaults</h2>
        <p className="mt-1 text-sm text-slate-500">Workspace-level defaults for in-app alerts across ticket creation, assignment, escalation, and customer replies.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <SettingToggle title="Notify assignees on assignment" description="Send in-app alerts whenever a ticket owner changes." defaultChecked />
        <SettingToggle title="Notify leads on escalations" description="Ensure project leads always receive an escalation alert." defaultChecked />
        <SettingToggle title="Notify request owners on customer replies" description="Bubble customer email replies to the current ticket owner." defaultChecked />
      </div>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  defaultChecked = false,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 p-4">
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" className="peer sr-only" defaultChecked={defaultChecked} />
        <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-green-500 peer-checked:after:translate-x-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-['']" />
      </label>
    </div>
  );
}
