export type PaginationOptions = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const normalizePositiveInt = (value: unknown, fallback: number) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.floor(parsedValue);
};

export const getPaginationOptions = (query: Record<string, unknown>): PaginationOptions | null => {
  const hasPage = query.page !== undefined;
  const hasPageSize = query.pageSize !== undefined;

  if (!hasPage && !hasPageSize) {
    return null;
  }

  const page = normalizePositiveInt(query.page, DEFAULT_PAGE);
  const pageSize = Math.min(normalizePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};

export const createPaginatedResponse = <T>(
  items: T[],
  total: number,
  pagination: Pick<PaginationOptions, 'page' | 'pageSize'>,
) => ({
  items,
  total,
  page: pagination.page,
  pageSize: pagination.pageSize,
  totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
});
