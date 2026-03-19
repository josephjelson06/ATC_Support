import { Ticket, FileText, Briefcase, Users } from 'lucide-react';

export default function DirectorDashboard() {
  const metrics = [
    { label: 'Total Active Tickets', value: '14', icon: Ticket, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Unbilled Hours', value: '124.5', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Projects', value: '8', icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Clients', value: '12', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Director Dashboard</h1>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
