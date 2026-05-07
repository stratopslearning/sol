"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/patterns/EmptyState";

const ROWS_PER_PAGE = 15;

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  sectionCount: number;
};

export default function AdminCoursesPageContentClient({
  courses,
}: {
  courses: CourseRow[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase() || "").includes(q),
    );
  }, [courses, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCourses.length / ROWS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredCourses.slice(start, start + ROWS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
      <Input
        type="search"
        placeholder="Search by title or description…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
                    <CourseFormModal
                      mode="delete"
                      course={{
                        id: course.id,
                        title: course.title,
                        description: course.description ?? undefined,
                      }}
                    />
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
                  if (currentPage > 1) setPage(currentPage - 1);
                }}
                className={
                  currentPage <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
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
                  isActive={p === currentPage}
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
                  if (currentPage < totalPages) setPage(currentPage + 1);
                }}
                className={
                  currentPage >= totalPages
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
