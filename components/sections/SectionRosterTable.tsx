'use client';

import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/patterns/EmptyState';
import { useFilteredSortedPage } from '@/hooks/useFilteredSortedPage';
import { compareDates, compareStringsIgnoreCase } from '@/lib/listSort';
import {
  comparePersonsByLastName,
  formatPersonName,
  type PersonNameFields,
} from '@/lib/personName';

export type RosterEnrollmentRow = {
  id: string;
  enrolledAt: string | Date;
  status: string;
  person: PersonNameFields & { id: string; email: string | null };
};

type RosterSortMode =
  | 'LAST_NAME'
  | 'FIRST_NAME'
  | 'EMAIL'
  | 'ENROLLED_DESC'
  | 'ENROLLED_ASC';

const ROWS_PER_PAGE = 15;

function rosterCompare(a: RosterEnrollmentRow, b: RosterEnrollmentRow, mode: RosterSortMode) {
  switch (mode) {
    case 'FIRST_NAME':
      return compareStringsIgnoreCase(
        a.person.firstName ?? '',
        b.person.firstName ?? '',
      );
    case 'EMAIL':
      return compareStringsIgnoreCase(
        a.person.email ?? '',
        b.person.email ?? '',
      );
    case 'ENROLLED_DESC':
      return compareDates(b.enrolledAt, a.enrolledAt);
    case 'ENROLLED_ASC':
      return compareDates(a.enrolledAt, b.enrolledAt);
    case 'LAST_NAME':
    default:
      return comparePersonsByLastName(a.person, b.person);
  }
}

export function SectionRosterTable({
  title,
  description,
  enrollments,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description?: string;
  enrollments: RosterEnrollmentRow[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [sortMode, setSortMode] = useState<RosterSortMode>('LAST_NAME');
  const [search, setSearch] = useState('');

  const compareFn = useCallback(
    (a: RosterEnrollmentRow, b: RosterEnrollmentRow) =>
      rosterCompare(a, b, sortMode),
    [sortMode],
  );

  const {
    page,
    setPage,
    totalPages,
    paginated,
  } = useFilteredSortedPage({
    rows: enrollments,
    search,
    filterFn: useCallback((row: RosterEnrollmentRow, q: string) => {
      if (!q.trim()) return true;
      const lower = q.toLowerCase();
      const name = formatPersonName(row.person).toLowerCase();
      return (
        name.includes(lower) ||
        (row.person.email ?? '').toLowerCase().includes(lower) ||
        row.status.toLowerCase().includes(lower)
      );
    }, []),
    compareFn,
    rowsPerPage: ROWS_PER_PAGE,
  });

  if (enrollments.length === 0) {
    return (
      <EmptyState
        eyebrow="Empty"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-lg text-ink">{title}</h3>
          {description ? (
            <p className="text-sm text-ink-muted mt-1">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select
            value={sortMode}
            onValueChange={(v) => setSortMode(v as RosterSortMode)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LAST_NAME">Last name A–Z</SelectItem>
              <SelectItem value="FIRST_NAME">First name A–Z</SelectItem>
              <SelectItem value="EMAIL">Email A–Z</SelectItem>
              <SelectItem value="ENROLLED_DESC">Enrolled (newest)</SelectItem>
              <SelectItem value="ENROLLED_ASC">Enrolled (oldest)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="search"
            placeholder="Search roster…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
        </div>
      </div>

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-ink-muted py-8">
                  No matches.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {formatPersonName(row.person)}
                  </TableCell>
                  <TableCell className="text-ink-muted text-sm">
                    {row.person.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-ink-muted tnum">
                    {new Date(row.enrolledAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === 'ACTIVE' ? 'success' : 'outline'}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
                className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(p);
                  }}
                  isActive={p === page}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
                className={
                  page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
