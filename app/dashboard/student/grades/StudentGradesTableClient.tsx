"use client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Trophy, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredAttempts = useMemo(() => {
    if (!search.trim()) return attempts;
    const q = search.toLowerCase();
    return attempts.filter(
      a =>
        a.quizTitle.toLowerCase().includes(q) ||
        (a.courseTitle?.toLowerCase() || '').includes(q)
    );
  }, [attempts, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAttempts.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedAttempts = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAttempts.slice(start, start + ROWS_PER_PAGE);
  }, [filteredAttempts, currentPage]);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  if (attempts.length === 0) {
    return (
      <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10 text-center py-12">
        <CardContent>
          <FileText className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-xl font-semibold text-white mb-2">No Quiz Attempts Yet</h3>
          <p className="text-white/60 mb-4">Your grades will appear here after you complete a quiz.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">My Grades & Attempt History</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by quiz or course..."
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
                <TableHead className="text-white/60 font-medium">Quiz</TableHead>
                <TableHead className="text-white/60 font-medium">Course</TableHead>
                <TableHead className="text-white/60 font-medium">Submitted</TableHead>
                <TableHead className="text-white/60 font-medium">Score</TableHead>
                <TableHead className="text-white/60 font-medium">Status</TableHead>
                <TableHead className="text-white/60 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAttempts.map(a => (
                <TableRow key={a.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{a.quizTitle}</TableCell>
                  <TableCell className="text-white/80">{a.courseTitle || '—'}</TableCell>
                  <TableCell className="text-white/80 text-sm">
                    {a.submittedAt
                      ? new Date(a.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {a.maxScore != null ? `${a.score ?? 0} / ${a.maxScore}` : (a.percentage != null ? `${a.percentage}%` : '—')}
                  </TableCell>
                  <TableCell>
                    {a.passed ? (
                      <Trophy className="w-5 h-5 text-yellow-500 inline" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" className="bg-white/15 text-white border border-white/30 hover:bg-white/25">
                      <Link href={`/quiz/${a.quizId}/review?attemptId=${a.id}`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white/90 hover:bg-white/15 hover:text-white'}
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
                    className={p === currentPage ? 'cursor-pointer border-white/30 bg-white/15 text-white' : 'cursor-pointer text-white/90 hover:bg-white/15 hover:text-white'}
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
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer text-white/90 hover:bg-white/15 hover:text-white'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
