import { useRole } from '../../contexts/RoleContext';
import SupportEngineerDashboard from './dashboards/SupportEngineerDashboard';
import ProjectLeadDashboard from './dashboards/ProjectLeadDashboard';
import ProjectManagerDashboard from './dashboards/ProjectManagerDashboard';

export default function Dashboard() {
  const { role } = useRole();

  switch (role) {
    case 'Support Engineer':
      return <SupportEngineerDashboard />;
    case 'Project Lead':
      return <ProjectLeadDashboard />;
    case 'Project Manager':
      return <ProjectManagerDashboard />;
    default:
      return <ProjectManagerDashboard />;
  }
}
