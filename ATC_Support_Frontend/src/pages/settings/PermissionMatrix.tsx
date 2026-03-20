const matrixRows = [
  { capability: 'View ticket queue', se: 'Yes', pl: 'Yes', pm: 'Yes' },
  { capability: 'Assign / start / resolve tickets', se: 'Yes', pl: 'Yes', pm: 'View only' },
  { capability: 'Escalate tickets', se: 'Yes', pl: 'N/A', pm: 'View only' },
  { capability: 'View clients', se: 'Context only', pl: 'Yes', pm: 'Yes' },
  { capability: 'Manage clients and projects', se: 'No', pl: 'No', pm: 'Yes' },
  { capability: 'View reports and analytics', se: 'No', pl: 'Yes', pm: 'Yes' },
  { capability: 'Manage users and settings', se: 'No', pl: 'No', pm: 'Yes' },
];

export default function PermissionMatrix() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Permission Matrix</h2>
        <p className="mt-1 text-sm text-slate-500">Operator-first permission summary used by the refactored IA and route visibility rules.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Capability</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">SE</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">PL</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">PM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixRows.map((row) => (
                <tr key={row.capability}>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.capability}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.se}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.pl}</td>
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
