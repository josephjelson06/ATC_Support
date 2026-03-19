const DEFAULT_WIDTH = 3;

export const formatDisplayId = (prefix: string, id: number, width = DEFAULT_WIDTH) =>
  `${prefix}-${id.toString().padStart(width, '0')}`;

export const withDisplayId = <T extends { id: number }>(record: T, prefix: string) => ({
  ...record,
  displayId: formatDisplayId(prefix, record.id),
});
