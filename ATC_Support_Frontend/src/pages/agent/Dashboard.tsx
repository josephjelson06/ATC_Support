import { useRole } from '../../contexts/RoleContext';
import SupportEngineerDashboard from './dashboards/SupportEngineerDashboard';
import ProjectManagerDashboard from './dashboards/ProjectManagerDashboard';

export default function Dashboard() {
  const { backendRole } = useRole();

  switch (backendRole) {
    case 'PM':
      return <ProjectManagerDashboard />;
    case 'SE':
    default:
      return <SupportEngineerDashboard />;
  }
}
