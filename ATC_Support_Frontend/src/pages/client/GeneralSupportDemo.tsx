import type { ComponentType } from 'react';
import { ArrowRight, Headphones, ShieldCheck, Wrench } from 'lucide-react';

import ChatWidget from '../../components/widget/ChatWidget';

export default function GeneralSupportDemo() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f3ec] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-lg font-black text-white shadow-lg shadow-orange-200">A</div>
          <div>
            <p className="text-sm font-black leading-tight">Aarkay Techno Consultants</p>
            <p className="text-xs font-semibold text-slate-500">IT infrastructure / automation / support</p>
          </div>
        </div>
        <a href="#support" className="hidden rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800 sm:inline-flex">
          Need Support
        </a>
      </header>

      <main>
        <section id="support" className="relative mx-auto grid min-h-[calc(100svh-84px)] max-w-7xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[0.98fr_1.02fr]">
          <div className="absolute right-[-12rem] top-10 h-[34rem] w-[34rem] rounded-full bg-orange-200/50 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-[-12rem] h-[30rem] w-[30rem] rounded-full bg-slate-300/50 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-600">ATC General Support</p>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              One support entry for software, hardware, and client help.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
              This page previews how the ATC website will host Julia as a floating support widget. Clients identify themselves, choose the support type, get guided help, and escalate only when needed.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('atc-open-demo-widget'))}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-orange-200 transition-colors hover:bg-orange-700"
              >
                Open Julia
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="max-w-xs text-sm font-semibold leading-6 text-slate-500">
                In production, this becomes one script tag placed on the ATC website.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <SupportPoint icon={Headphones} label="General desk" text="Start from the ATC website when the client does not know the exact project or device path." />
              <SupportPoint icon={Wrench} label="Hardware ready" text="Printers, scanners, and network devices can be linked to the right client context." />
              <SupportPoint icon={ShieldCheck} label="Escalation log" text="Every support session is traceable, and unresolved cases become human tickets." />
            </div>
            <div className="mt-8 rounded-[2rem] border border-slate-900/10 bg-white/70 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Embed preview</p>
              <code className="mt-3 block overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-orange-100">
                {'<script src="https://support.atcgroup.co.in/widget.js" data-widget-key="general"></script>'}
              </code>
            </div>
          </div>
        </section>
      </main>

      <ChatWidget widgetKey="general" startOpen />
    </div>
  );
}

function SupportPoint({
  icon: Icon,
  label,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.65rem] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
      <Icon className="h-5 w-5 text-orange-600" />
      <h2 className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-slate-500">{label}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
