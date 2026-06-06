"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, TrendingUp, Users } from "lucide-react";

import { QuizActions } from "@/components/quiz/QuizActions";
import { EmptyState } from "@/components/patterns/EmptyState";
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
import { withBasePath } from "@/lib/basePath";

const ROWS_PER_PAGE = 15;
type SortMode = "DEFAULT" | "DUE_ASC" | "DUE_DESC";

function getStatusBadge(status: "Active" | "Draft" | "Closed") {
  if (status === "Active") return <Badge variant="success">Active</Badge>;
  if (status === "Draft") return <Badge variant="warning">Draft</Badge>;
  return <Badge variant="outline">Closed</Badge>;
}

function dueTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function sortByDueDate<T extends { endDate?: string | Date | null }>(
  quizzes: T[],
  sortMode: SortMode,
) {
  if (sortMode === "DEFAULT") return quizzes;
  return [...quizzes].sort((a, b) => {
    const aDue = dueTime(a.endDate);
    const bDue = dueTime(b.endDate);
    if (aDue == null && bDue == null) return 0;
    if (aDue == null) return 1;
    if (bDue == null) return -1;
    return sortMode === "DUE_ASC" ? aDue - bDue : bDue - aDue;
  });
}

export default function ProfessorQuizzesTableClient({
  quizzesWithStats,
  sections,
}: {
  quizzesWithStats: any[];
  sections: { id: string; name: string }[];
}) {
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("DEFAULT");
  const [page, setPage] = useState(1);

  const filteredQuizzes = useMemo(() => {
    const filtered = quizzesWithStats.filter((quiz) => {
      const matchesSearch =
        !search || quiz.title.toLowerCase().includes(search.toLowerCase());
      const sectionIds =
        quiz.sectionAssignments
          ?.map((sa: any) => sa.section?.id)
          .filter(Boolean) ?? [];
      const matchesSection =
        sectionFilter === "ALL" || sectionIds.includes(sectionFilter);
      return matchesSearch && matchesSection;
    });
    return sortByDueDate(filtered, sortMode);
  }, [quizzesWithStats, search, sectionFilter, sortMode]);

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
  }, [search, sectionFilter, sortMode]);

  if (quizzesWithStats.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        eyebrow="Empty"
        title="No quizzes assigned yet."
        description="Compose your first quiz, or wait until an administrator assigns one to a section you teach."
        actions={
          <Button asChild>
            <Link href="/dashboard/professor/quiz/new">
              <Plus className="h-4 w-4" />
              Compose quiz
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="md:w-56">
          <Select
            value={sectionFilter}
            onValueChange={(v) => setSectionFilter(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:w-52">
          <Select
            value={sortMode}
            onValueChange={(value) => setSortMode(value as SortMode)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by due date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEFAULT">Default order</SelectItem>
              <SelectItem value="DUE_ASC">Due date: earliest</SelectItem>
              <SelectItem value="DUE_DESC">Due date: latest</SelectItem>
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
        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-[1270px]">
            <colgroup>
              <col className="w-[240px]" />
              <col className="w-[110px]" />
              <col className="w-[220px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
              <col className="w-[170px]" />
              <col className="w-[180px]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="tnum">Learners</TableHead>
                <TableHead className="tnum">Attempts</TableHead>
                <TableHead className="tnum">Average</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="sticky right-0 z-10 bg-surface-sunken/95 px-3 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuizzes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-ink-muted py-8"
                  >
                    No quizzes match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedQuizzes.map((quiz) => {
                  const sectionLabel =
                    quiz.sectionAssignments?.length > 0
                      ? quiz.sectionAssignments
                          .map((sa: any) => sa.section?.name)
                          .filter(Boolean)
                          .join(", ")
                      : "—";
                  const dueDate = quiz.dueDateLabel as string | null;
                  const createdDate = quiz.createdDateLabel as string | null;
                  return (
                    <TableRow key={quiz.id}>
                      <TableCell className="align-top">
                        <div className="flex flex-col min-w-0">
                          <span
                            className="font-medium text-ink truncate"
                            title={quiz.title}
                          >
                            {quiz.title}
                          </span>
                          <span className="text-xs text-ink-faint tnum">
                            {quiz.questions?.length ?? 0} questions
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant={
                            quiz.isCreatedByProfessor ? "default" : "accent"
                          }
                        >
                          {quiz.isCreatedByProfessor ? "Created" : "Assigned"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-ink-muted align-top">
                        <span
                          className="block truncate"
                          title={sectionLabel}
                        >
                          {sectionLabel}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        {getStatusBadge(quiz.isActive ? "Active" : "Draft")}
                      </TableCell>
                      <TableCell className="tnum align-top">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-ink-faint" />
                          {quiz.uniqueStudents}
                        </span>
                      </TableCell>
                      <TableCell className="tnum align-top">
                        {quiz.totalAttempts}
                      </TableCell>
                      <TableCell className="tnum align-top">
                        <span className="inline-flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-ink-faint" />
                          {quiz.averageScore}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-ink tnum">
                            {dueDate ? `Due ${dueDate}` : "No due date"}
                          </span>
                          <span className="text-xs text-ink-faint tnum">
                            {createdDate ? `Created ${createdDate}` : "Created —"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="sticky right-0 z-10 bg-paper px-3 text-right align-top">
                        <div className="flex min-w-max items-center justify-end">
                          <QuizActions
                            quizId={quiz.id}
                            isActive={quiz.isActive}
                            isCreatedByProfessor={quiz.isCreatedByProfessor}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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
