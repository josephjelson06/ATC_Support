import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bot, FileQuestion, MessageSquareShare, ShieldCheck } from 'lucide-react';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { useResolvedWidgetKey } from '../../hooks/useResolvedWidgetKey';
import { buildWidgetRequestHeaders } from '../../lib/widgetRuntime';
import type { WidgetFaqResponse } from '../../lib/types';

export default function ClientDashboard() {
  const widgetKey = useResolvedWidgetKey();
  const widgetRequestHeaders = useMemo(
    () => buildWidgetRequestHeaders(typeof window !== 'undefined' ? window.location.origin : ''),
    [],
  );
  const widgetQuery = useAsyncData(
    () => apiFetch<WidgetFaqResponse>(`/widget/${widgetKey}/faqs`, { auth: false, headers: widgetRequestHeaders }),
    [widgetKey, widgetRequestHeaders],
  );

  if (widgetQuery.isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 bg-white rounded-3xl border border-slate-200 shadow-sm" />
          ))}
        </div>
        <div className="h-96 bg-white rounded-3xl border border-slate-200 shadow-sm" />
      </div>
    );
  }

  if (widgetQuery.error || !widgetQuery.data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white border border-red-200 rounded-3xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Support view unavailable</h1>
          <p className="text-sm text-slate-500 mt-3">{widgetQuery.error || 'Unable to load project support data.'}</p>
          <button
            onClick={widgetQuery.reload}
            className="mt-5 px-5 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { project, faqs } = widgetQuery.data;
  const isJuliaReady = project.juliaReadiness?.isReady ?? false;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{project.name} Support Overview</h1>
          <p className="text-slate-500 mt-2">This public support area is now powered by the same project data the widget uses.</p>
        </div>
        <Link
          to={`/submit-ticket?widgetKey=${encodeURIComponent(widgetKey)}`}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-bold transition-colors shadow-sm text-center"
        >
          Create support ticket
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <OverviewCard icon={FileQuestion} label="Project FAQs" value={String(faqs.length)} accent="orange" />
        <OverviewCard icon={Bot} label="AI Support" value={isJuliaReady ? 'Ready' : 'Needs Setup'} accent={isJuliaReady ? 'green' : 'purple'} />
        <OverviewCard icon={ShieldCheck} label="Project Status" value={project.status} accent="green" />
        <OverviewCard icon={MessageSquareShare} label="Support Path" value="FAQ → AI → Human" accent="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Available FAQs</h2>
            <p className="text-sm text-slate-500 mt-2">These are the exact FAQs available inside the Julia widget.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {faqs.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No FAQs are configured for this project yet.</div>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="p-6">
                  <h3 className="text-base font-bold text-slate-900">{faq.question}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{faq.answer}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900">How support works</h2>
            <div className="mt-5 space-y-4">
              {[
                ['1', 'Check FAQs', 'Start with the project knowledge already published by the team.'],
                ['2', 'Ask Julia', 'Use the widget for contextual AI help scoped to this project.'],
                ['3', 'Escalate', 'If the issue remains, submit a ticket for the internal team.'],
              ].map(([step, title, description]) => (
                <div key={step} className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black shrink-0">
                    {step}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-6">
            <h2 className="text-xl font-bold">Need human help now?</h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              The standalone ticket form now submits straight to the backend using this project's runtime widget key.
            </p>
            <Link
              to={`/submit-ticket?widgetKey=${encodeURIComponent(widgetKey)}`}
              className="mt-5 inline-flex items-center justify-center px-5 py-3 bg-orange-600 hover:bg-orange-700 rounded-2xl font-bold transition-colors"
            >
              Submit a direct escalation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FileQuestion;
  label: string;
  value: string;
  accent: 'orange' | 'purple' | 'green' | 'blue';
}) {
  const theme =
    accent === 'purple'
      ? 'bg-purple-50 text-purple-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : accent === 'blue'
          ? 'bg-blue-50 text-blue-600'
          : 'bg-orange-50 text-orange-600';

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
