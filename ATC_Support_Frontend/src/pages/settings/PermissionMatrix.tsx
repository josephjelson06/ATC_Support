import PageHeader from '../../components/layout/PageHeader';

const matrixRows = [
  { capability: 'View tickets', se1: 'All', se2: 'Queue + mine', se3: 'Project scope', pm: 'All' },
  { capability: 'Assign to self', se1: 'Yes', se2: 'Yes', se3: 'Yes', pm: 'Yes' },
  { capability: 'Assign to others', se1: 'Yes', se2: 'No', se3: 'No', pm: 'Yes' },
  { capability: 'Return ticket to queue', se1: 'Yes', se2: 'Own only', se3: 'Own only', pm: 'Yes' },
  { capability: 'Resolve / reopen / waiting', se1: 'Yes', se2: 'Own only', se3: 'Scope / own', pm: 'Yes' },
  { capability: 'Escalate tickets', se1: 'Yes', se2: 'Own only', se3: 'Yes', pm: 'Yes' },
  { capability: 'View clients and projects', se1: 'All', se2: 'All', se3: 'Project scope', pm: 'All' },
  { capability: 'Manage clients and projects', se1: 'No', se2: 'No', se3: 'No', pm: 'Yes' },
  { capability: 'Manage project docs / FAQs', se1: 'No', se2: 'No', se3: 'Yes', pm: 'Yes' },
  { capability: 'Manage users and access', se1: 'No', se2: 'No', se3: 'No', pm: 'Yes' },
] as const;

export default function PermissionMatrix() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader title="Permission Matrix" description="Reference matrix for PM authority and SE1 / SE2 / SE3 operational behavior." />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Capability</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">SE1</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">SE2</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">SE3</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">PM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixRows.map((row) => (
                <tr key={row.capability}>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.capability}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.se1}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.se2}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.se3}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.pm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
