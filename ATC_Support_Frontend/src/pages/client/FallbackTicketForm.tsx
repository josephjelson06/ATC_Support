import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, FileQuestion, Send } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { DEFAULT_WIDGET_KEY } from '../../lib/config';
import type { ApiTicket, TicketPriority, WidgetFaqResponse } from '../../lib/types';

const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function FallbackTicketForm() {
  const { showToast } = useToast();
  const widgetQuery = useAsyncData(
    () => apiFetch<WidgetFaqResponse>(`/widget/${DEFAULT_WIDGET_KEY}/faqs`, { auth: false }),
    [],
  );
  const [form, setForm] = useState({
    name: '',
    email: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as TicketPriority,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<ApiTicket | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiFetch<ApiTicket>('/tickets', {
        method: 'POST',
        auth: false,
        body: {
          widgetKey: DEFAULT_WIDGET_KEY,
          name: form.name.trim(),
          email: form.email.trim(),
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
        },
      });

      setSubmittedTicket(response);
      setForm({
        name: '',
        email: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
      });
      showToast('success', 'Support ticket submitted successfully.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectName = widgetQuery.data?.project.name || 'Selected Project';

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/70">
              <h1 className="text-3xl font-bold text-slate-900">Submit Support Ticket</h1>
              <p className="text-slate-500 mt-2">
                This form now creates a real backend ticket for <span className="font-semibold text-slate-700">{projectName}</span>.
              </p>
            </div>

            {submittedTicket ? (
              <div className="p-8">
                <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white text-green-600 flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mt-5">Ticket submitted</h2>
                  <p className="text-sm text-slate-600 mt-3">Your request has been escalated to the support team.</p>
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-orange-600 font-mono font-bold border border-orange-100">
                    {submittedTicket.displayId}
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setSubmittedTicket(null)}
                      className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-colors"
                    >
                      Submit another ticket
                    </button>
                    <Link
                      to="/"
                      className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold border border-slate-200 transition-colors"
                    >
                      Return to support home
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <form className="p-8 space-y-6" onSubmit={(event) => void handleSubmit(event)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Full Name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                    placeholder="Ravi Kumar"
                  />
                  <FormField
                    label="Work Email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                    placeholder="ravi@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Related Project</label>
                  <input
                    type="text"
                    value={projectName}
                    readOnly
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
                  <FormField
                    label="Issue Title"
                    type="text"
                    required
                    value={form.title}
                    onChange={(value) => setForm((current) => ({ ...current, title: value }))}
                    placeholder="Warehouse portal access denied"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TicketPriority }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white min-w-40"
                    >
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Detailed Description</label>
                  <textarea
                    rows={6}
                    required
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                    placeholder="Describe what you tried, the exact error, and when the issue started."
                  />
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Attachments are not connected yet</p>
                    <p className="text-sm text-amber-800 mt-1">
                      File uploads are outside the current backend scope, so include any key details directly in the description for now.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || widgetQuery.isLoading || !!widgetQuery.error}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-md"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting…' : 'Submit Support Ticket'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900">Before you submit</h2>
            <p className="text-sm text-slate-500 mt-2">
              You may be able to resolve the issue faster through the project FAQ or the Julia widget.
            </p>
            <div className="mt-5 space-y-4">
              {(widgetQuery.data?.faqs || []).slice(0, 4).map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <FileQuestion className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{faq.question}</p>
                      <p className="text-sm text-slate-500 mt-1">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!widgetQuery.isLoading && (widgetQuery.data?.faqs.length || 0) === 0 && (
                <p className="text-sm text-slate-500">No FAQs are configured for this project yet.</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-6">
            <h2 className="text-xl font-bold">Live backend wiring</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>- Uses the public backend ticket endpoint.</li>
              <li>- Submits against widget key <span className="font-mono text-white">{DEFAULT_WIDGET_KEY}</span>.</li>
              <li>- Creates the same ticket type the internal queue now reads.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  type,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
      />
    </div>
  );
}
