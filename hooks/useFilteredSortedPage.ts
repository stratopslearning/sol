'use client';

import { useEffect, useMemo, useState } from 'react';

import type { SortDirection } from '@/lib/listSort';
import { sortRows } from '@/lib/listSort';

type UseFilteredSortedPageOptions<T> = {
  rows: T[];
  search: string;
  filterFn: (row: T, search: string) => boolean;
  compareFn: (a: T, b: T) => number;
  rowsPerPage: number;
  defaultDirection?: SortDirection;
};

export function useFilteredSortedPage<T>({
  rows,
  search,
  filterFn,
  compareFn,
  rowsPerPage,
  defaultDirection = 'asc',
}: UseFilteredSortedPageOptions<T>) {
  const [direction, setDirection] = useState<SortDirection>(defaultDirection);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => rows.filter((row) => filterFn(row, search)),
    [rows, filterFn, search],
  );

  const sorted = useMemo(
    () => sortRows(filtered, compareFn, direction),
    [filtered, compareFn, direction],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, currentPage, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [search, direction, rows.length]);

  return {
    direction,
    setDirection,
    page: currentPage,
    setPage,
    totalPages,
    filteredCount: filtered.length,
    paginated,
    sorted,
  };
}
