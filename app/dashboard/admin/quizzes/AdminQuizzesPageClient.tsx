"use client";
import Link from 'next/link';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuizEditForm } from '@/components/quiz/QuizEditForm';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { cleanQuizDescription } from '@/lib/utils';
import { Plus, MoreHorizontal } from 'lucide-react';

const ROWS_PER_PAGE = 15;

export default function AdminQuizzesPageClient({
  allSections,
  allQuizzes,
  allQuizSections,
}: {
  allSections: any[];
  allQuizzes: any[];
  allQuizSections: any[];
}) {
  const [quizzesWithQuestions, setQuizzesWithQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  const courseOptions = allSections.map(section => ({
    id: section.id,
    title: `${section.name} (${section.course?.title || 'Unknown'})`,
  }));

  // Flat list: one row per quiz with assigned section names
  const flatQuizzes = useMemo(() => {
    return quizzesWithQuestions.map(quiz => {
      const sectionIds = allQuizSections.filter(qs => qs.quizId === quiz.id).map(qs => qs.sectionId);
      const sectionNames = sectionIds
        .map(sid => allSections.find(s => s.id === sid)?.name)
        .filter(Boolean) as string[];
      return {
        ...quiz,
        assignedSectionIds: sectionIds,
        assignedSectionNames: sectionNames,
      };
    });
  }, [quizzesWithQuestions, allQuizSections, allSections]);

  const filteredQuizzes = useMemo(() => {
    return flatQuizzes.filter(quiz => {
      const matchesSearch = !search || quiz.title.toLowerCase().includes(search.toLowerCase());
      const matchesSection =
        sectionFilter === 'ALL' || quiz.assignedSectionIds.includes(sectionFilter);
      return matchesSearch && matchesSection;
    });
  }, [flatQuizzes, search, sectionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredQuizzes.slice(start, start + ROWS_PER_PAGE);
  }, [filteredQuizzes, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, sectionFilter]);

  useEffect(() => {
    async function loadQuizQuestions() {
      try {
        const data = await Promise.all(
          allQuizzes.map(async quiz => {
            const res = await fetch(`/api/quiz/${quiz.id}/questions`);
            if (res.ok) {
              const json = await res.json();
              return { ...quiz, questions: json.questions || [] };
            }
            return { ...quiz, questions: [] };
          })
        );
        setQuizzesWithQuestions(data);
      } catch (error) {
        console.error('Error loading quiz questions:', error);
        setQuizzesWithQuestions(allQuizzes.map(q => ({ ...q, questions: [] })));
      } finally {
        setIsLoading(false);
      }
    }
    loadQuizQuestions();
  }, [allQuizzes]);

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      const res = await fetch(`/api/admin/quiz/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Quiz deleted successfully');
        window.location.reload();
      } else {
        toast.error('Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  }

  async function handleUnassignQuiz(quizId: string, sectionId: string) {
    if (!confirm('Are you sure you want to unassign this quiz from this section?')) return;
    try {
      const res = await fetch(`/api/admin/quiz/${quizId}/section/${sectionId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Quiz unassigned from section');
        window.location.reload();
      } else {
        toast.error('Failed to unassign quiz from section');
      }
    } catch (error) {
      console.error('Error unassigning quiz:', error);
      toast.error('Failed to unassign quiz from section');
    }
  }

  function handleEditSuccess() {
    setEditingQuizId(null);
    toast.success('Quiz updated successfully');
    window.location.reload();
  }

  if (isLoading) {
    return (
      <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto text-white text-center">Loading quizzes...</div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
      <section className="w-full max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Quizzes</h1>
          <p className="text-white/60 text-lg">Create and manage quizzes. Assign them to any section.</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/dashboard/admin/quizzes/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz
          </Link>
        </Button>
      </section>

      <Card className="w-full max-w-7xl mx-auto rounded-xl shadow-lg bg-white/10 border border-white/10">
        <CardHeader>
          <CardTitle className="text-lg text-white">All Quizzes</CardTitle>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="w-full md:w-48">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-full border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md px-3 py-2">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent className="border-white/20 bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md">
                  <SelectItem value="ALL">All sections</SelectItem>
                  {allSections.map(s => (
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
                  <TableHead className="text-white/60 font-medium">Title</TableHead>
                  <TableHead className="text-white/60 font-medium">Section(s)</TableHead>
                  <TableHead className="text-white/60 font-medium">Attempts</TableHead>
                  <TableHead className="text-white/60 font-medium">Time limit</TableHead>
                  <TableHead className="text-white/60 font-medium">Questions</TableHead>
                  <TableHead className="text-white/60 font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedQuizzes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-white/60 py-8">
                      No quizzes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedQuizzes.map(quiz => (
                    <TableRow key={quiz.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <div>
                          <div className="font-semibold">{quiz.title}</div>
                          {cleanQuizDescription(quiz.description) && (
                            <div className="text-xs text-white/60 truncate max-w-[200px]">
                              {cleanQuizDescription(quiz.description)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/80 text-sm">
                        {quiz.assignedSectionNames.length > 0
                          ? quiz.assignedSectionNames.join(', ')
                          : 'Unassigned'}
                      </TableCell>
                      <TableCell className="text-white/80">{quiz.maxAttempts ?? '—'}</TableCell>
                      <TableCell className="text-white/80">
                        {quiz.timeLimit != null ? `${quiz.timeLimit} min` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-white/80">{quiz.questions?.length ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingQuizId(quiz.id)}
                            className="text-white border-white/20"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                          >
                            Delete
                          </Button>
                          {quiz.assignedSectionIds.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-white border-white/20"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#18181b] border-white/10">
                                {quiz.assignedSectionIds.map((sectionId: string) => {
                                  const section = allSections.find(s => s.id === sectionId);
                                  return (
                                    <DropdownMenuItem
                                      key={sectionId}
                                      onClick={() => handleUnassignQuiz(quiz.id, sectionId)}
                                      className="text-white focus:bg-white/10"
                                    >
                                      Unassign from {section?.name ?? sectionId}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
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

      {editingQuizId && (() => {
        const quiz = quizzesWithQuestions.find(q => q.id === editingQuizId);
        return quiz ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[#18181b] rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <QuizEditForm
                quiz={{ ...quiz, questions: quiz.questions ?? [] }}
                courses={courseOptions}
                apiEndpoint={`/api/admin/quiz/${quiz.id}/update`}
                onSuccess={handleEditSuccess}
                assignedSectionIds={allQuizSections.filter(qs => qs.quizId === quiz.id).map(qs => qs.sectionId)}
              />
              <Button className="mt-4" onClick={() => setEditingQuizId(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null;
      })()}
    </main>
  );
}
