import ChatWidget from '../../components/widget/ChatWidget';

export default function GeneralSupportDemo() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-center rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-600">ATC General Support</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            One support entry point for software, hardware, and project-linked help.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
            This is the sample static page for the ATC website support model. The widget on the right runs in
            general-support mode, identifies the client, lets the user choose hardware or software help, and can
            escalate to a human ticket when needed.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <InfoCard title="Website Support" description="Use this flow when support starts from the main ATC website." />
            <InfoCard title="Client Identification" description="Julia begins only after the client is identified by email, phone, or client ID." />
            <InfoCard title="Escalation Ready" description="When self-service is not enough, the session can become a human ticket." />
          </div>
        </section>

        <section className="flex min-h-[70vh] items-stretch justify-center lg:min-h-full">
          <div className="w-full max-w-[420px]">
            <ChatWidget widgetKey="general" mode="embedded" startOpen />
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
