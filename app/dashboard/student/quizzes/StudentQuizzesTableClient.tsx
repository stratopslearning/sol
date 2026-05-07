"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/patterns/EmptyState";
import { formatDateTimeUTC, normalizeDatabaseDate } from "@/lib/utils";

const ROWS_PER_PAGE = 15;

type QuizRow = {
  id: string;
  title: string;
  endDate: Date | string | null;
  maxAttempts: number;
  sectionNames: string[];
};

export default function StudentQuizzesTableClient({
  quizzes,
  attemptCountByQuizId,
  bestPercentageByQuizId,
  latestAttemptIdByQuizId,
}: {
  quizzes: QuizRow[];
  attemptCountByQuizId: Record<string, number>;
  bestPercentageByQuizId: Record<string, number>;
  latestAttemptIdByQuizId: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const sections = useMemo(() => {
    const seen = new Set<string>();
    return quizzes
      .flatMap((q) => q.sectionNames)
      .filter((name) => {
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .sort();
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const matchesSearch =
        !search || quiz.title.toLowerCase().includes(search.toLowerCase());
      const matchesSection =
        sectionFilter === "ALL" || quiz.sectionNames.includes(sectionFilter);
      return matchesSearch && matchesSection;
    });
  }, [quizzes, search, sectionFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuizzes.length / ROWS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredQuizzes.slice(start, start + ROWS_PER_PAGE);
  }, [filteredQuizzes, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, sectionFilter]);

  if (quizzes.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        eyebrow="Nothing assigned"
        title="No quizzes available."
        description="No quizzes have been assigned to your sections yet. Check back when your professor publishes new work."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="md:w-56">
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sections</SelectItem>
              {sections.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="search"
          placeholder="Search by quiz title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="paper paper-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quiz title</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Best</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuizzes.map((quiz) => {
              const attemptCount = attemptCountByQuizId[quiz.id] ?? 0;
              const bestPct = bestPercentageByQuizId[quiz.id] ?? null;
              const latestAttemptId = latestAttemptIdByQuizId[quiz.id] ?? null;
              const hasAttempted = attemptCount > 0;
              const maxAttempts = quiz.maxAttempts || 1;
              const canRetake =
                hasAttempted && maxAttempts > 1 && attemptCount < maxAttempts;
              const endDate = normalizeDatabaseDate(quiz.endDate);
              const isOverdue = endDate ? endDate < new Date() : false;

              let statusBadge: React.ReactNode;
              if (isOverdue) {
                statusBadge = <Badge variant="destructive">Overdue</Badge>;
              } else if (hasAttempted) {
                statusBadge = <Badge variant="info">Attempted</Badge>;
              } else {
                statusBadge = <Badge variant="outline">Open</Badge>;
              }

              let actionButton: React.ReactNode;
              if (!hasAttempted) {
                actionButton = (
                  <Button asChild size="sm">
                    <Link href={`/quiz/${quiz.id}`}>Start</Link>
                  </Button>
                );
              } else if (canRetake) {
                actionButton = (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/quiz/${quiz.id}`}>Retake</Link>
                  </Button>
                );
              } else if (latestAttemptId) {
                actionButton = (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/quiz/${quiz.id}/results?attemptId=${latestAttemptId}`}
                    >
                      Review
                    </Link>
                  </Button>
                );
              }

              return (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">{quiz.title}</TableCell>
                  <TableCell className="text-ink-muted">
                    {quiz.sectionNames.length
                      ? quiz.sectionNames.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell className="tnum">
                    {bestPct != null ? `${bestPct}%` : "—"}
                  </TableCell>
                  <TableCell className="tnum text-ink-muted">
                    {attemptCount}/{maxAttempts}
                  </TableCell>
                  <TableCell
                    className={isOverdue ? "text-danger" : "text-ink-muted"}
                  >
                    {quiz.endDate ? formatDateTimeUTC(quiz.endDate) : "—"}
                  </TableCell>
                  <TableCell>{statusBadge}</TableCell>
                  <TableCell className="text-right">{actionButton}</TableCell>
                </TableRow>
              );
            })}
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
