"use client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { QuizActions } from '@/components/quiz/QuizActions';
import { useMemo, useState } from 'react';

const ROWS_PER_PAGE = 15;

function getStatusBadge(status: 'Active' | 'Draft' | 'Closed') {
  if (status === 'Active') return <Badge className="bg-green-600/20 text-green-400 border-green-600">Active</Badge>;
  if (status === 'Draft') return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600">Draft</Badge>;
  return <Badge className="bg-gray-600/20 text-gray-300 border-gray-600">Closed</Badge>;
}

export default function ProfessorQuizzesTableClient({
  quizzesWithStats,
  sections,
}: {
  quizzesWithStats: any[];
  sections: { id: string; name: string }[];
}) {
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredQuizzes = useMemo(() => {
    return quizzesWithStats.filter(quiz => {
      const matchesSearch = !search || quiz.title.toLowerCase().includes(search.toLowerCase());
      const sectionNames = quiz.sectionAssignments?.map((sa: any) => sa.section?.name).filter(Boolean) ?? [];
      const sectionIds = quiz.sectionAssignments?.map((sa: any) => sa.section?.id).filter(Boolean) ?? [];
      const matchesSection =
        sectionFilter === 'ALL' || sectionIds.includes(sectionFilter);
      return matchesSearch && matchesSection;
    });
  }, [quizzesWithStats, search, sectionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredQuizzes.slice(start, start + ROWS_PER_PAGE);
  }, [filteredQuizzes, currentPage]);

  const resetPage = () => setPage(1);

  if (quizzesWithStats.length === 0) {
    return (
      <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">Quiz Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-white/40" />
            <h3 className="text-lg font-medium text-white mb-2">No quizzes available</h3>
            <p className="text-white/60 mb-6">No quizzes have been assigned to your enrolled sections yet</p>
            <Button asChild>
              <Link href="/dashboard/professor/quiz/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Quiz
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
      <CardHeader>
        <CardTitle className="text-xl text-white">Quiz Management</CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="w-full md:w-48">
            <Select
              value={sectionFilter}
              onValueChange={v => {
                setSectionFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md px-3 py-2">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent className="border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md">
                <SelectItem value="ALL">All sections</SelectItem>
                {sections.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
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
              onChange={e => {
                setSearch(e.target.value);
                resetPage();
              }}
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
                <TableHead className="text-white/60 font-medium">Quiz Title</TableHead>
                <TableHead className="text-white/60 font-medium">Type</TableHead>
                <TableHead className="text-white/60 font-medium">Section(s)</TableHead>
                <TableHead className="text-white/60 font-medium">Status</TableHead>
                <TableHead className="text-white/60 font-medium">Students</TableHead>
                <TableHead className="text-white/60 font-medium">Attempts</TableHead>
                <TableHead className="text-white/60 font-medium">Avg Score</TableHead>
                <TableHead className="text-white/60 font-medium">Created</TableHead>
                <TableHead className="text-white/60 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuizzes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-white/60 py-8">
                    No quizzes found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedQuizzes.map(quiz => (
                  <TableRow key={quiz.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      <div>
                        <div className="font-semibold">{quiz.title}</div>
                        <div className="text-xs text-white/60">{quiz.questions?.length ?? 0} questions</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80">
                      <Badge
                        variant={quiz.isCreatedByProfessor ? 'default' : 'secondary'}
                        className={
                          quiz.isCreatedByProfessor
                            ? 'bg-blue-600/20 text-blue-400 border-blue-600'
                            : 'bg-purple-600/20 text-purple-400 border-purple-600'
                        }
                      >
                        {quiz.isCreatedByProfessor ? 'Created' : 'Assigned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/80 text-sm">
                      {quiz.sectionAssignments?.length > 0
                        ? quiz.sectionAssignments.map((sa: any) => sa.section?.name).filter(Boolean).join(', ')
                        : 'No Section'}
                    </TableCell>
                    <TableCell>{getStatusBadge(quiz.isActive ? 'Active' : 'Draft')}</TableCell>
                    <TableCell className="text-white/80">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {quiz.uniqueStudents}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80">{quiz.totalAttempts}</TableCell>
                    <TableCell className="text-white/80">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {quiz.averageScore}%
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60 text-sm">
                      {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <QuizActions quizId={quiz.id} isActive={quiz.isActive} />
                    </TableCell>
                  </TableRow>
                ))
              )}
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
