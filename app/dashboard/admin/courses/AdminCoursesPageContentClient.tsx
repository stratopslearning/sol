"use client";

import React, { useCallback, useState } from "react";
import { BookOpen } from "lucide-react";

import { CourseFormModal } from "@/components/admin/CourseFormModal";
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
import { EmptyState } from "@/components/patterns/EmptyState";
import { useFilteredSortedPage } from "@/hooks/useFilteredSortedPage";
import { compareStringsIgnoreCase } from "@/lib/listSort";

const ROWS_PER_PAGE = 15;

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  sectionCount: number;
  createdAt?: string | Date | null;
};

type CourseSortMode = "TITLE" | "SECTIONS" | "CREATED_DESC" | "CREATED_ASC";

function courseCompare(a: CourseRow, b: CourseRow, mode: CourseSortMode) {
  switch (mode) {
    case "SECTIONS":
      return a.sectionCount - b.sectionCount;
    case "CREATED_DESC":
      return (
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      );
    case "CREATED_ASC":
      return (
        new Date(a.createdAt ?? 0).getTime() -
        new Date(b.createdAt ?? 0).getTime()
      );
    case "TITLE":
    default:
      return compareStringsIgnoreCase(a.title, b.title);
  }
}

export default function AdminCoursesPageContentClient({
  courses,
}: {
  courses: CourseRow[];
}) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<CourseSortMode>("TITLE");

  const {
    page,
    setPage,
    totalPages,
    paginated: paginatedCourses,
  } = useFilteredSortedPage({
    rows: courses,
    search,
    filterFn: useCallback((c: CourseRow, q: string) => {
      if (!q.trim()) return true;
      const lower = q.toLowerCase();
      return (
        c.title.toLowerCase().includes(lower) ||
        (c.description?.toLowerCase() || "").includes(lower)
      );
    }, []),
    compareFn: useCallback(
      (a: CourseRow, b: CourseRow) => courseCompare(a, b, sortMode),
      [sortMode],
    ),
    rowsPerPage: ROWS_PER_PAGE,
  });

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        eyebrow="Empty"
        title="No courses yet."
        description="Create your first course to begin organising sections, learners, and quizzes."
        actions={<CourseFormModal mode="create" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3">
        <Select
          value={sortMode}
          onValueChange={(v) => setSortMode(v as CourseSortMode)}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TITLE">Title A–Z</SelectItem>
            <SelectItem value="SECTIONS">Section count</SelectItem>
            <SelectItem value="CREATED_DESC">Created (newest)</SelectItem>
            <SelectItem value="CREATED_ASC">Created (oldest)</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="search"
          placeholder="Search by title or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCourses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-ink-muted py-8"
                >
                  No courses found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell className="text-ink-muted max-w-md truncate">
                    {course.description || "—"}
                  </TableCell>
                  <TableCell className="tnum">{course.sectionCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <CourseFormModal
                        mode="edit"
                        course={{
                          id: course.id,
                          title: course.title,
                          description: course.description ?? undefined,
                        }}
                      />
                      <CourseFormModal
                        mode="delete"
                        course={{
                          id: course.id,
                          title: course.title,
                          description: course.description ?? undefined,
                        }}
                      />
                    </div>
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
