import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { resolveWidgetKey } from '../lib/widgetRuntime';

export const useResolvedWidgetKey = () => {
  const location = useLocation();

  return useMemo(() => resolveWidgetKey(location.search), [location.search]);
};
