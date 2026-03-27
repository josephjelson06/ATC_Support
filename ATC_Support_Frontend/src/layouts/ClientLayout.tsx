import { Outlet } from 'react-router-dom';
import ChatWidget from '../components/widget/ChatWidget';
import { useResolvedWidgetKey } from '../hooks/useResolvedWidgetKey';

export default function ClientLayout() {
  const widgetKey = useResolvedWidgetKey();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Outlet />
      <ChatWidget widgetKey={widgetKey} />
    </div>
  );
}
