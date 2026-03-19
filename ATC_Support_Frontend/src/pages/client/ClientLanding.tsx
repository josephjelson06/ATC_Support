import { Link } from 'react-router-dom';
import { Bot, FileQuestion, Headset } from 'lucide-react';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { DEFAULT_WIDGET_KEY } from '../../lib/config';
import type { WidgetFaqResponse } from '../../lib/types';

export default function ClientLanding() {
  const widgetQuery = useAsyncData(
    () => apiFetch<WidgetFaqResponse>(`/widget/${DEFAULT_WIDGET_KEY}/faqs`, { auth: false }),
    [],
  );

  if (widgetQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-4xl space-y-6 animate-pulse">
          <div className="h-12 w-72 bg-slate-200 rounded-2xl mx-auto" />
          <div className="h-5 w-[32rem] max-w-full bg-slate-200 rounded-xl mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 bg-white border border-slate-200 rounded-3xl shadow-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (widgetQuery.error || !widgetQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-white border border-red-200 rounded-3xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Support center unavailable</h1>
          <p className="text-sm text-slate-500 mt-3">{widgetQuery.error || 'Unable to load project support details right now.'}</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-[0.2em]">
            ATC Support
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mt-5">{project.name} Support Center</h1>
          <p className="text-lg text-slate-600 mt-4">
            Start with project FAQs, chat with Julia in the widget, or create a human support ticket directly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={FileQuestion}
            title={`${faqs.length} live FAQ${faqs.length === 1 ? '' : 's'}`}
            description="Browse project-specific answers pulled from the backend."
          />
          <FeatureCard
            icon={Bot}
            title="Julia AI is ready"
            description="Use the widget in the bottom-right corner for guided troubleshooting."
          />
          <FeatureCard
            icon={Headset}
            title="Human escalation"
            description="Create a direct support ticket if you already know you need help."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Popular help topics</h2>
                <p className="text-sm text-slate-500 mt-2">These are the latest FAQs for this project.</p>
              </div>
              <Link to="/dashboard" className="text-sm font-bold text-orange-600 hover:text-orange-700">
                Open support view
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {faqs.slice(0, 4).map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-base font-bold text-slate-900">{faq.question}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-8 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Current Project</p>
            <h2 className="text-3xl font-black mt-4">{project.name}</h2>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed">
              The widget and standalone form are currently scoped to this project’s backend data using the configured widget key.
            </p>

            <div className="mt-8 space-y-3">
              <Link
                to="/submit-ticket"
                className="block w-full text-center px-5 py-3 bg-orange-600 hover:bg-orange-700 rounded-2xl font-bold transition-colors"
              >
                Submit a ticket
              </Link>
              <Link
                to="/dashboard"
                className="block w-full text-center px-5 py-3 bg-white/10 hover:bg-white/15 rounded-2xl font-bold transition-colors"
              >
                Browse support resources
              </Link>
            </div>

            <p className="text-xs text-slate-400 mt-6">
              Need guided help? Open the Julia widget in the bottom-right corner to start a live project-scoped support session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileQuestion;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mt-5">{title}</h2>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
    </div>
  );
}
