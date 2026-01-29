"use client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import React, { useMemo, useState } from 'react';
import { formatDateTimeUTC, normalizeDatabaseDate } from '@/lib/utils';
import { FileText } from 'lucide-react';
import Link from 'next/link';

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
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const sections = useMemo(() => {
    const seen = new Set<string>();
    return quizzes.flatMap(q => q.sectionNames).filter(name => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    }).sort();
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const matchesSearch =
        !search ||
        quiz.title.toLowerCase().includes(search.toLowerCase());
      const matchesSection =
        sectionFilter === 'ALL' ||
        quiz.sectionNames.includes(sectionFilter);
      return matchesSearch && matchesSection;
    });
  }, [quizzes, search, sectionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredQuizzes.slice(start, start + ROWS_PER_PAGE);
  }, [filteredQuizzes, currentPage]);

  React.useEffect(() => {
    setPage(1);
  }, [search, sectionFilter]);

  if (quizzes.length === 0) {
    return (
      <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10 text-center py-12">
        <CardContent>
          <FileText className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-xl font-semibold text-white mb-2">No Quizzes Available</h3>
          <p className="text-white/60 mb-4">No quizzes have been assigned to your sections yet.</p>
          <div className="text-white/40 text-sm">Check back later for new quizzes in your enrolled sections.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">Available Quizzes</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="w-full md:w-48">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md px-3 py-2">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent className="border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md">
                <SelectItem value="ALL">All sections</SelectItem>
                {sections.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by quiz title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border-white/20 text-white"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/60 font-medium">Quiz title</TableHead>
                <TableHead className="text-white/60 font-medium">Section(s)</TableHead>
                <TableHead className="text-white/60 font-medium">Best %</TableHead>
                <TableHead className="text-white/60 font-medium">Attempts</TableHead>
                <TableHead className="text-white/60 font-medium">Due</TableHead>
                <TableHead className="text-white/60 font-medium">Status</TableHead>
                <TableHead className="text-white/60 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuizzes.map(quiz => {
                const attemptCount = attemptCountByQuizId[quiz.id] ?? 0;
                const bestPct = bestPercentageByQuizId[quiz.id] ?? null;
                const latestAttemptId = latestAttemptIdByQuizId[quiz.id] ?? null;
                const hasAttempted = attemptCount > 0;
                const maxAttempts = quiz.maxAttempts || 1;
                const canRetake = hasAttempted && maxAttempts > 1 && attemptCount < maxAttempts;
                const endDate = normalizeDatabaseDate(quiz.endDate);
                const isOverdue = endDate ? endDate < new Date() : false;

                let statusBadge: React.ReactNode;
                if (isOverdue) {
                  statusBadge = (
                    <Badge className="bg-red-600/20 text-red-400 border-red-600">Overdue</Badge>
                  );
                } else if (hasAttempted) {
                  statusBadge = (
                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Attempted</Badge>
                  );
                } else {
                  statusBadge = (
                    <Badge className="bg-white/20 text-white/80 border-white/30">Not attempted</Badge>
                  );
                }

                let actionButton: React.ReactNode;
                if (!hasAttempted) {
                  actionButton = (
                    <Button asChild size="sm" className="text-white bg-blue-600 hover:bg-blue-700">
                      <Link href={`/quiz/${quiz.id}`}>Start Quiz</Link>
                    </Button>
                  );
                } else if (latestAttemptId && !canRetake) {
                  actionButton = (
                    <Button asChild size="sm" variant="secondary" className="text-white border-white/20">
                      <Link href={`/quiz/${quiz.id}/results?attemptId=${latestAttemptId}`}>Review</Link>
                    </Button>
                  );
                } else if (canRetake) {
                  actionButton = (
                    <Button asChild size="sm" variant="outline" className="text-white border-white/20">
                      <Link href={`/quiz/${quiz.id}`}>Retake Quiz</Link>
                    </Button>
                  );
                } else {
                  actionButton = (
                    <Button asChild size="sm" variant="secondary" className="text-white border-white/20">
                      <Link href={`/quiz/${quiz.id}/results?attemptId=${latestAttemptId}`}>Review</Link>
                    </Button>
                  );
                }

                return (
                  <TableRow key={quiz.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{quiz.title}</TableCell>
                    <TableCell className="text-white/80">
                      {quiz.sectionNames.length ? quiz.sectionNames.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {bestPct != null ? `${bestPct}%` : '—'}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {attemptCount}/{maxAttempts}
                    </TableCell>
                    <TableCell className={isOverdue ? 'text-red-400' : 'text-white/80'}>
                      {quiz.endDate ? formatDateTimeUTC(quiz.endDate) : '—'}
                    </TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell className="text-right">{actionButton}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    if (currentPage > 1) setPage(currentPage - 1);
                  }}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    onClick={e => {
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
                  onClick={e => {
                    e.preventDefault();
                    if (currentPage < totalPages) setPage(currentPage + 1);
                  }}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
