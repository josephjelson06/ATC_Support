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
    <div className="flex h-[100dvh] w-full items-end justify-end overflow-hidden bg-transparent">
      <div className="h-full w-full p-0 sm:flex sm:items-end sm:justify-end sm:p-4">
        <div className="h-full w-full sm:h-[640px] sm:max-h-[88vh] sm:w-[390px]">
          <ChatWidget widgetKey={widgetKey} mode="embedded" startOpen hostOrigin={hostOrigin} />
        </div>
      </div>
    </div>
  );
}
