import { Link as LinkIcon, CheckCircle2, AlertCircle, Plus, Settings } from 'lucide-react';

export default function Integrations() {
  const integrations = [
    { id: 1, name: 'Slack', description: 'Send ticket notifications and updates to Slack channels.', status: 'Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' },
    { id: 2, name: 'Jira', description: 'Link support tickets to Jira engineering issues.', status: 'Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Jira_Logo.svg' },
    { id: 3, name: 'GitHub', description: 'Create and link GitHub issues directly from tickets.', status: 'Not Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg' },
    { id: 4, name: 'Salesforce', description: 'Sync client data and view CRM context in tickets.', status: 'Not Connected', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Integrations</h2>
          <p className="text-sm text-slate-500 mt-1">Connect your workspace with third-party tools.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Browse App Directory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map(integration => (
          <div key={integration.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-2">
                  <img src={integration.icon} alt={integration.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{integration.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{integration.description}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {integration.status === 'Connected' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Not Connected</span>
                  </>
                )}
              </div>
              
              {integration.status === 'Connected' ? (
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>
              ) : (
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm">
                  <LinkIcon className="w-3.5 h-3.5" /> Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
