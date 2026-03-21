import TicketOpsDashboard from './TicketOpsDashboard';

export default function SupportEngineerDashboard() {
  return (
    <TicketOpsDashboard
      title="Engineer Dashboard"
      description="Track your operational workload with quick KPI visibility, a brief ticket triage table, and a weekly stacked status trend."
      tableTitle="Ticket Brief"
    />
  );
}
