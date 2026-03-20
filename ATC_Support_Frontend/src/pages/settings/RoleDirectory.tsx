import PageHeader from '../../components/layout/PageHeader';

const roleDescriptions = [
  {
    role: 'Project Manager',
    code: 'PM',
    summary: 'Portfolio-level oversight, client ownership, project setup, reporting, and administration.',
  },
  {
    role: 'Project Lead',
    code: 'PL',
    summary: 'Escalation handling, project-level operational oversight, client visibility, and delivery reporting.',
  },
  {
    role: 'Support Engineer',
    code: 'SE',
    summary: 'Primary operator for queue work: assign, reply, update, resolve, and escalate when needed.',
  },
];

export default function RoleDirectory() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Roles"
        description="Live role model for the current frontend refactor. This stays aligned to PM, PL, and SE."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {roleDescriptions.map((role) => (
          <article key={role.code} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-black text-slate-900">{role.role}</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-600">{role.code}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{role.summary}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
