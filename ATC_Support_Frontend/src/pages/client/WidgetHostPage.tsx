import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import ChatWidget from '../../components/widget/ChatWidget';
import { useResolvedWidgetKey } from '../../hooks/useResolvedWidgetKey';
import { resolveWidgetHostOrigin } from '../../lib/widgetRuntime';

export default function WidgetHostPage() {
  const location = useLocation();
  const widgetKey = useResolvedWidgetKey();
  const hostOrigin = useMemo(() => resolveWidgetHostOrigin(location.search), [location.search]);

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-transparent">
      <ChatWidget widgetKey={widgetKey} mode="embedded" startOpen hostOrigin={hostOrigin} />
    </div>
  );
}
