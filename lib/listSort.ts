export type SortDirection = 'asc' | 'desc';

export function sortRows<T>(
  rows: T[],
  compareFn: (a: T, b: T) => number,
  direction: SortDirection = 'asc',
): T[] {
  const sorted = [...rows].sort(compareFn);
  return direction === 'desc' ? sorted.reverse() : sorted;
}

export function compareStringsIgnoreCase(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function compareNullableNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const aVal = a ?? -Infinity;
  const bVal = b ?? -Infinity;
  return aVal - bVal;
}

export function compareDates(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
): number {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return -1;
  if (Number.isNaN(bTime)) return 1;
  return aTime - bTime;
}
