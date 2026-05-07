"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";

import CopyEnrollmentButton from "@/components/CopyEnrollmentButton";
import { Button } from "@/components/ui/button";
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
const ROWS_PER_PAGE = 10;

export default function ProfessorSectionsPageContentClient({
  sectionsList,
}: {
  sectionsList: any[];
}) {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const courses = useMemo(() => {
    const seen = new Set<string>();
    return sectionsList
      .map((s) => s.course)
      .filter((c): c is NonNullable<typeof c> => c != null)
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
  }, [sectionsList]);

  const filteredSections = useMemo(() => {
    return sectionsList.filter((section) => {
      const matchesSearch =
        !search ||
        section.name.toLowerCase().includes(search.toLowerCase()) ||
        (section.course?.title?.toLowerCase() || "").includes(
          search.toLowerCase(),
        );
      const matchesCourse =
        courseFilter === "ALL" || section.courseId === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [sectionsList, search, courseFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSections.length / ROWS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedSections = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredSections.slice(start, start + ROWS_PER_PAGE);
  }, [filteredSections, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, courseFilter]);

  if (sectionsList.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="h-5 w-5" />}
        eyebrow="Empty"
        title="No sections assigned."
        description="An administrator will assign you to sections at the start of the term. If you expected access, contact registrar."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="md:w-56">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="search"
          placeholder="Search sections or courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Faculty code</TableHead>
              <TableHead>Learner code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSections.map((section) => (
              <TableRow key={section.id}>
                <TableCell className="font-medium">{section.name}</TableCell>
                <TableCell className="text-ink-muted">
                  {section.course?.title || "Unknown"}
                </TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-2">
                    <code className="font-mono text-xs bg-surface-sunken text-ink px-2 py-1 rounded border border-rule">
                      {section.professorEnrollmentCode}
                    </code>
                    <CopyEnrollmentButton
                      code={section.professorEnrollmentCode}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-2">
                    <code className="font-mono text-xs bg-surface-sunken text-ink px-2 py-1 rounded border border-rule">
                      {section.studentEnrollmentCode}
                    </code>
                    <CopyEnrollmentButton
                      code={section.studentEnrollmentCode}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/dashboard/professor/sections/${section.id}/gradebook`}
                      >
                        Gradebook
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/dashboard/professor/sections/${section.id}`}
                      >
                        Details
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
