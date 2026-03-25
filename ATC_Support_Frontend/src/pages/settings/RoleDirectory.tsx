import PageHeader from '../../components/layout/PageHeader';
import { appPaths } from '../../lib/navigation';

const roleDescriptions = [
  {
    role: 'Project Manager',
    code: 'PM',
    summary: 'System administrator. PM manages clients, projects, users, reassignment, and the overall support portfolio.',
  },
  {
    role: 'Support Engineer 1',
    code: 'SE1',
    summary: 'Global queue operator. Can see the full queue and assign or reassign tickets to self or others.',
  },
  {
    role: 'Support Engineer 2',
    code: 'SE2',
    summary: 'Global specialist. Can see open queue work and self-owned tickets, but primarily claims and executes work personally.',
  },
  {
    role: 'Support Engineer 3',
    code: 'SE3',
    summary: 'Project specialist. Works inside assigned project scope, can manage project knowledge, and handles project-owned escalations.',
  },
] as const;

export default function RoleDirectory() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Roles"
        description="Live PM / SE role model with SE support levels, scope, and assignment authority."
        breadcrumbs={[
          { label: 'Administration', to: appPaths.admin.usersAccess },
          { label: 'Users & Access', to: appPaths.admin.usersAccess },
          { label: 'Roles' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
