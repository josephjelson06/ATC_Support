import { Outlet } from 'react-router-dom';
import ChatWidget from '../components/widget/ChatWidget';

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Outlet />
      <ChatWidget />
    </div>
  );
}
