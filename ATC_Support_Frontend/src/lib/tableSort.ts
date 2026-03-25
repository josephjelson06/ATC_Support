export type SortDirection = 'asc' | 'desc';

export function getNextSortDirection(active: boolean, currentDirection: SortDirection): SortDirection {
  return active && currentDirection === 'asc' ? 'desc' : 'asc';
}

export function compareSortValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
  direction: SortDirection,
) {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  const normalizedLeft = typeof left === 'string' ? left.toLowerCase() : left;
  const normalizedRight = typeof right === 'string' ? right.toLowerCase() : right;

  if (normalizedLeft < normalizedRight) {
    return direction === 'asc' ? -1 : 1;
  }

  if (normalizedLeft > normalizedRight) {
    return direction === 'asc' ? 1 : -1;
  }

  return 0;
}
