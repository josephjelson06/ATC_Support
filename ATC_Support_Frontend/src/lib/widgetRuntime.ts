import { DEFAULT_WIDGET_KEY } from './config';

declare global {
  interface Window {
    ATCWidgetConfig?: {
      widgetKey?: string;
    };
  }
}

export const resolveWidgetKey = (search = '', fallbackWidgetKey = DEFAULT_WIDGET_KEY) => {
  const searchParams = new URLSearchParams(search);
  const queryWidgetKey = searchParams.get('widgetKey')?.trim();

  if (queryWidgetKey) {
    return queryWidgetKey;
  }

  const globalWidgetKey = typeof window !== 'undefined' ? window.ATCWidgetConfig?.widgetKey?.trim() : '';

  return globalWidgetKey || fallbackWidgetKey;
};

const normalizeOrigin = (value: string | null | undefined) => {
  if (!value?.trim()) {
    return '';
  }

  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

export const resolveWidgetHostOrigin = (search = '', fallbackOrigin?: string) => {
  const searchParams = new URLSearchParams(search);
  const queryHostOrigin = normalizeOrigin(searchParams.get('hostOrigin'));

  if (queryHostOrigin) {
    return queryHostOrigin;
  }

  if (fallbackOrigin) {
    const normalizedFallbackOrigin = normalizeOrigin(fallbackOrigin);

    if (normalizedFallbackOrigin) {
      return normalizedFallbackOrigin;
    }
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
};

export const buildWidgetRequestHeaders = (hostOrigin?: string) =>
  hostOrigin ? ({ 'X-ATC-Widget-Origin': hostOrigin } satisfies HeadersInit) : undefined;

export const buildWidgetDeliveryPack = (origin: string, widgetKey: string) => {
  const encodedWidgetKey = encodeURIComponent(widgetKey);

  return {
    scriptSrc: `${origin}/widget.js`,
    embedCode: `<script src="${origin}/widget.js" data-widget-key="${widgetKey}"></script>`,
    publicSupportUrl: `${origin}/?widgetKey=${encodedWidgetKey}`,
    widgetHostUrl: `${origin}/widget-host?widgetKey=${encodedWidgetKey}`,
    fallbackTicketUrl: `${origin}/submit-ticket?widgetKey=${encodedWidgetKey}`,
    supportDashboardUrl: `${origin}/dashboard?widgetKey=${encodedWidgetKey}`,
  };
};
