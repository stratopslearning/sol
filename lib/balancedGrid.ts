/**
 * Balanced card grids — avoid orphaned leftover cards (especially a single
 * card centered in the last row of a 3-column layout).
 *
 * Rules:
 * - 1 → one column
 * - 2 or 4 → two columns (2×2 for four)
 * - otherwise → up to `maxCols` (default 3)
 * - when count % maxCols === 1 and count > maxCols, the last card spans the
 *   full row so the bottom edge stays even
 */

export type BalancedGridMaxCols = 2 | 3 | 4;

const COL_CLASS: Record<BalancedGridMaxCols, string> = {
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
};

export function getBalancedGridClass(
  count: number,
  maxCols: BalancedGridMaxCols = 3,
): string {
  if (count <= 1) return 'grid grid-cols-1 gap-4';
  if (count === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  // Prefer a clean 2×2 over a 3+1 orphan row.
  if (count === 4 && maxCols >= 2) {
    return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  }
  return COL_CLASS[maxCols];
}

export function getBalancedItemClass(
  count: number,
  index: number,
  maxCols: BalancedGridMaxCols = 3,
): string {
  const base = 'h-full';
  if (index !== count - 1) return base;
  // 2×2 layout for four items — no spanning needed.
  if (count === 4 && maxCols >= 2) return base;

  const remainder = count % maxCols;
  if (remainder !== 1 || count <= maxCols) return base;

  // Single leftover on the last row: stretch across the full grid width.
  if (maxCols === 3) return `${base} lg:col-span-3`;
  if (maxCols === 4) return `${base} lg:col-span-4`;
  if (maxCols === 2) return `${base} sm:col-span-2`;
  return base;
}
