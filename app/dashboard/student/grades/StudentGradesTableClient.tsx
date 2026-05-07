"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/patterns/EmptyState";

const ROWS_PER_PAGE = 15;

type AttemptRow = {
  id: string;
  quizId: string;
  quizTitle: string;
  courseTitle: string | null;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  passed: boolean | null;
};

export default function StudentGradesTableClient({
  attempts,
}: {
  attempts: AttemptRow[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredAttempts = useMemo(() => {
    if (!search.trim()) return attempts;
    const q = search.toLowerCase();
    return attempts.filter(
      (a) =>
        a.quizTitle.toLowerCase().includes(q) ||
        (a.courseTitle?.toLowerCase() || "").includes(q),
    );
  }, [attempts, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttempts.length / ROWS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedAttempts = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAttempts.slice(start, start + ROWS_PER_PAGE);
  }, [filteredAttempts, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (attempts.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        eyebrow="Empty"
        title="No attempts yet."
        description="Your grades will appear here after you submit your first quiz."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="Search by quiz or course…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quiz</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAttempts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.quizTitle}</TableCell>
                <TableCell className="text-ink-muted">
                  {a.courseTitle || "—"}
                </TableCell>
                <TableCell className="text-ink-muted text-sm">
                  {a.submittedAt
                    ? new Date(a.submittedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="tnum">
                  {a.maxScore != null
                    ? `${a.score ?? 0} / ${a.maxScore}`
                    : a.percentage != null
                    ? `${a.percentage}%`
                    : "—"}
                </TableCell>
                <TableCell>
                  {a.passed ? (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <Badge variant="success">Passed</Badge>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-danger">
                      <XCircle className="h-4 w-4" />
                      <Badge variant="destructive">Failed</Badge>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/quiz/${a.quizId}/review?attemptId=${a.id}`}>
                      Review
                    </Link>
                  </Button>
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
