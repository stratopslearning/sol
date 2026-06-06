"use client";

import { useCallback, useState } from "react";

import BulkImportModal from "@/components/admin/BulkImportModal";
import { UserActions } from "@/components/admin/UserActions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFilteredSortedPage } from "@/hooks/useFilteredSortedPage";
import { compareStringsIgnoreCase } from "@/lib/listSort";
import {
  comparePersonsByLastName,
  formatPersonName,
} from "@/lib/personName";

const ROLE_VARIANT: Record<string, "default" | "info" | "success" | "accent"> = {
  ADMIN: "accent",
  PROFESSOR: "info",
  STUDENT: "success",
};

const ROWS_PER_PAGE = 15;

type UserRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
};

type UserSortMode = "LAST_NAME" | "FIRST_NAME" | "EMAIL" | "ROLE";

function userCompare(a: UserRow, b: UserRow, mode: UserSortMode) {
  switch (mode) {
    case "FIRST_NAME":
      return compareStringsIgnoreCase(a.firstName ?? "", b.firstName ?? "");
    case "EMAIL":
      return compareStringsIgnoreCase(a.email ?? "", b.email ?? "");
    case "ROLE":
      return compareStringsIgnoreCase(a.role, b.role);
    case "LAST_NAME":
    default:
      return comparePersonsByLastName(a, b);
  }
}

export default function UserTableWithFilters({ users }: { users: UserRow[] }) {
  const [role, setRole] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [sortMode, setSortMode] = useState<UserSortMode>("LAST_NAME");

  const {
    page,
    setPage,
    totalPages,
    paginated: paginatedUsers,
  } = useFilteredSortedPage({
    rows: users,
    search,
    filterFn: useCallback((user: UserRow, q: string) => {
      const matchesRole = role === "ALL" || user.role === role;
      if (!q.trim()) return matchesRole;
      const searchLower = q.toLowerCase();
      const fullName = formatPersonName(user).toLowerCase();
      const matchesSearch =
        fullName.includes(searchLower) ||
        (user.firstName?.toLowerCase().includes(searchLower) ?? false) ||
        (user.lastName?.toLowerCase().includes(searchLower) ?? false) ||
        (user.email?.toLowerCase().includes(searchLower) ?? false);
      return matchesRole && matchesSearch;
    }, [role]),
    compareFn: useCallback(
      (a: UserRow, b: UserRow) => userCompare(a, b, sortMode),
      [sortMode],
    ),
    rowsPerPage: ROWS_PER_PAGE,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="md:w-48">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="PROFESSOR">Professor</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select
          value={sortMode}
          onValueChange={(v) => setSortMode(v as UserSortMode)}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LAST_NAME">Last name A–Z</SelectItem>
            <SelectItem value="FIRST_NAME">First name A–Z</SelectItem>
            <SelectItem value="EMAIL">Email A–Z</SelectItem>
            <SelectItem value="ROLE">Role</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <BulkImportModal />
      </div>

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {formatPersonName(user)}
                </TableCell>
                <TableCell className="text-ink-muted font-mono text-xs">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANT[user.role] ?? "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} />
                </TableCell>
              </TableRow>
            ))}
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-ink-muted py-8"
                >
                  No people found.
                </TableCell>
              </TableRow>
            ) : null}
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
                className={
                  page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
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
                  page >= totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
