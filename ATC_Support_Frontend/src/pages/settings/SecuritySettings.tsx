import { Shield, Key, Lock, Smartphone } from 'lucide-react';

export default function SecuritySettings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Security & Authentication</h2>
        <p className="text-sm text-slate-500 mt-1">Manage password policies, 2FA, and API access.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Authentication Policies</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enforce security standards across your workspace.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-500">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Require Two-Factor Authentication (2FA)</h4>
                <p className="text-sm text-slate-500 mt-1">Force all agents and admins to use 2FA when logging in.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <hr className="border-slate-100" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">SSO (Single Sign-On)</h4>
                <p className="text-sm text-slate-500 mt-1">Allow users to log in using Google Workspace or Okta.</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              Configure SSO
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">API Keys</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage keys for programmatic access to the API.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Keys</span>
              <button className="text-sm font-bold text-blue-600 hover:underline">Generate New Key</button>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Production API Key</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">sk_live_*******************</p>
                </div>
                <button className="text-sm font-bold text-red-600 hover:underline">Revoke</button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Development Key</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">sk_test_*******************</p>
                </div>
                <button className="text-sm font-bold text-red-600 hover:underline">Revoke</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
