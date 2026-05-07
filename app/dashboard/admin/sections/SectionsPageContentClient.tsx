"use client";

import React, { useEffect, useMemo, useState } from "react";

import CopyEnrollmentButton from "@/components/CopyEnrollmentButton";
import { SectionFormModal } from "@/components/admin/SectionFormModal";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { withBasePath } from "@/lib/basePath";

const ROWS_PER_PAGE = 15;

export default function SectionsPageContentClient({
  allSections,
  allCourses,
}: {
  allSections: any[];
  allCourses: any[];
}) {
  const [filter, setFilter] = useState("");
  const [courseId, setCourseId] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const filteredSections = useMemo(() => {
    return allSections.filter((section) => {
      const matchesSearch =
        section.name.toLowerCase().includes(filter.toLowerCase()) ||
        section.professorEnrollmentCode
          .toLowerCase()
          .includes(filter.toLowerCase()) ||
        section.studentEnrollmentCode
          .toLowerCase()
          .includes(filter.toLowerCase()) ||
        (section.course?.title?.toLowerCase() || "").includes(
          filter.toLowerCase(),
        );
      const matchesCourse =
        courseId === "ALL" || section.courseId === courseId;
      return matchesSearch && matchesCourse;
    });
  }, [allSections, filter, courseId]);

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
  }, [filter, courseId]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Overview", href: withBasePath("/dashboard/admin") },
          { label: "Sections" },
        ]}
        eyebrow="Catalog"
        title="Sections."
        description="Every section across every course, with enrolment codes ready to share with faculty and learners."
        actions={
          <div className="flex items-center gap-2">
            <SectionFormModal mode="create" allCourses={allCourses} />
            <SectionFormModal mode="create" bulk allCourses={allCourses} />
          </div>
        }
      />

      <div className="mt-10 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="md:w-56">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All courses</SelectItem>
                {allCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="search"
            placeholder="Search by section, course, or code…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
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
              {paginatedSections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-ink-muted py-8"
                  >
                    No sections found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">
                      {section.name}
                    </TableCell>
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
                      <SectionFormModal mode="delete" section={section} />
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
    </>
  );
}
