import type { ApiTicket } from './types';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '365d';

export type TimeBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type CsvCell = string | number;

const dayMs = 24 * 60 * 60 * 1_000;

export const analyticsPeriodOptions: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '365d', label: 'Last 12 Months' },
];

const analyticsPeriodDays: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const getAnalyticsPeriodStart = (period: AnalyticsPeriod, now = new Date()) => {
  const next = startOfDay(now);
  next.setTime(next.getTime() - dayMs * (analyticsPeriodDays[period] - 1));
  return next;
};

export const filterItemsByPeriod = <T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  period: AnalyticsPeriod,
  now = new Date(),
) => {
  const start = getAnalyticsPeriodStart(period, now).getTime();
  const end = now.getTime();

  return items.filter((item) => {
    const timestamp = toTimestamp(getDate(item));
    return timestamp !== null && timestamp >= start && timestamp <= end;
  });
};

export const buildTimeBuckets = (period: AnalyticsPeriod, now = new Date()): TimeBucket[] => {
  const buckets: TimeBucket[] = [];

  if (period === '365d') {
    let cursor = getAnalyticsPeriodStart(period, now);

    while (cursor <= now) {
      const bucketStart = startOfDay(cursor);
      const next = new Date(bucketStart);
      next.setMonth(next.getMonth() + 1);
      const bucketEnd = new Date(Math.min(endOfDay(new Date(next.getTime() - 1)).getTime(), now.getTime()));

      buckets.push({
        key: bucketStart.toISOString(),
        label: bucketStart.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        start: bucketStart,
        end: bucketEnd,
      });

      cursor = startOfDay(next);
    }

    return buckets;
  }

  const stepDays = period === '90d' ? 7 : 1;
  let cursor = getAnalyticsPeriodStart(period, now);

  while (cursor <= now) {
    const bucketStart = startOfDay(cursor);
    const next = new Date(bucketStart);
    next.setDate(next.getDate() + stepDays);
    const bucketEnd = new Date(Math.min(endOfDay(new Date(next.getTime() - 1)).getTime(), now.getTime()));

    buckets.push({
      key: bucketStart.toISOString(),
      label: bucketStart.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      start: bucketStart,
      end: bucketEnd,
    });

    cursor = startOfDay(next);
  }

  return buckets;
};

export const countItemsInBuckets = <T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  buckets: TimeBucket[],
) =>
  buckets.map((bucket) =>
    items.reduce((count, item) => {
      const timestamp = toTimestamp(getDate(item));

      if (timestamp === null) {
        return count;
      }

      return timestamp >= bucket.start.getTime() && timestamp <= bucket.end.getTime() ? count + 1 : count;
    }, 0),
  );

export const calculateAverageResolutionHours = (tickets: ApiTicket[]) => {
  const resolvedTickets = tickets.filter((ticket) => ticket.resolvedAt);

  if (resolvedTickets.length === 0) {
    return null;
  }

  const totalMilliseconds = resolvedTickets.reduce((total, ticket) => {
    const createdAt = new Date(ticket.createdAt).getTime();
    const resolvedAt = new Date(ticket.resolvedAt as string).getTime();
    return total + (resolvedAt - createdAt);
  }, 0);

  return totalMilliseconds / resolvedTickets.length / 3_600_000;
};

export const formatAnalyticsHours = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}h`);

export const formatAnalyticsPercent = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`);

export const sumNumbers = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const downloadCsvFile = (filename: string, headers: string[], rows: CsvCell[][]) => {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

export const copyTextToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};
