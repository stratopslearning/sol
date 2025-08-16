"use client";
import { QuizCreationForm } from '@/components/quiz/QuizCreationForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuizEditForm } from '@/components/quiz/QuizEditForm';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function AdminQuizzesPageClient({ allSections, allQuizzes, allQuizSections }: { allSections: any[]; allQuizzes: any[]; allQuizSections: any[] }) {
  const [quizzesWithQuestions, setQuizzesWithQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Prepare course options for the form (for admin, these are actually sections)
  const courseOptions = allSections.map(section => ({
    id: section.id,
    title: `${section.name} (${section.course?.title || 'Unknown'})`,
  }));

  // Group quizzes by section
  const quizzesBySection: Record<string, any[]> = {};
  for (const section of allSections) {
    quizzesBySection[section.id] = [];
  }
  for (const quiz of quizzesWithQuestions) {
    const assignedSections = allQuizSections.filter(qs => qs.quizId === quiz.id).map(qs => qs.sectionId);
    if (assignedSections.length === 0) {
      quizzesBySection['__unassigned'] = quizzesBySection['__unassigned'] || [];
      quizzesBySection['__unassigned'].push(quiz);
    } else {
      for (const sectionId of assignedSections) {
        if (!quizzesBySection[sectionId]) quizzesBySection[sectionId] = [];
        quizzesBySection[sectionId].push(quiz);
      }
    }
  }

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Load questions for all quizzes
  useEffect(() => {
    async function loadQuizQuestions() {
      try {
        const quizzesWithQuestionsData = await Promise.all(
          allQuizzes.map(async (quiz) => {
            const response = await fetch(`/api/quiz/${quiz.id}/questions`);
            if (response.ok) {
              const questions = await response.json();
              return { ...quiz, questions: questions.questions || [] };
            }
            return { ...quiz, questions: [] };
          })
        );
        setQuizzesWithQuestions(quizzesWithQuestionsData);
      } catch (error) {
        console.error('Error loading quiz questions:', error);
        setQuizzesWithQuestions(allQuizzes.map(quiz => ({ ...quiz, questions: [] })));
      } finally {
        setIsLoading(false);
      }
    }

    loadQuizQuestions();
  }, [allQuizzes]);

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      const response = await fetch(`/api/admin/quiz/${quizId}`, { method: 'DELETE' });
      if (response.ok) {
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
      const response = await fetch(`/api/admin/quiz/${quizId}/section/${sectionId}`, { method: 'DELETE' });
      if (response.ok) {
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
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-white text-center">Loading quizzes...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
      <section className="w-full max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Quizzes</h1>
        <p className="text-white/60 text-lg">Create and manage quizzes. Assign them to any section.</p>
        <div className="mt-4">
          <QuizCreationForm
            courses={courseOptions}
            apiEndpoint="/api/admin/quiz/create"
          />
        </div>
      </section>
      <section className="w-full max-w-7xl mx-auto">
        {allSections.map(section => (
          <div key={section.id} className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              {section.name} <span className="text-white/40">({section.course?.title || 'Unknown'})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzesBySection[section.id]?.length > 0 ? (
                quizzesBySection[section.id].map(quiz => (
                  <Card key={quiz.id} className="rounded-2xl shadow-xl bg-white/5 border border-white/10 hover:shadow-2xl transition-shadow flex flex-col justify-between min-h-[180px] p-0 overflow-hidden">
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-6 pb-2">
                      <CardTitle className="text-xl text-white font-semibold break-words max-w-full">{quiz.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                        <Button size="sm" variant="outline" onClick={() => setEditingQuizId(quiz.id)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteQuiz(quiz.id)}>Delete</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleUnassignQuiz(quiz.id, section.id)}>Unassign</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-2 flex flex-col gap-2 break-words max-w-full">
                      <div className="text-white/70 text-base block min-h-[24px] break-words">{quiz.description}</div>
                      <div className="text-white/60 text-sm mt-2">Attempts: {quiz.maxAttempts} | Time Limit: {quiz.timeLimit || 'N/A'} min</div>
                      <div className="text-white/60 text-sm">Questions: {quiz.questions?.length ?? 0}</div>
                    </CardContent>
                    {editingQuizId === quiz.id && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                        <div className="bg-[#18181b] rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                          <QuizEditForm 
                            quiz={{ ...quiz, questions: quiz.questions ?? [] }} 
                            courses={courseOptions}
                            apiEndpoint={`/api/admin/quiz/${quiz.id}/update`}
                            onSuccess={handleEditSuccess}
                            assignedSectionIds={allQuizSections.filter(qs => qs.quizId === quiz.id).map(qs => qs.sectionId)}
                          />
                          <Button className="mt-4" onClick={() => setEditingQuizId(null)}>Close</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <div className="text-white/40">No quizzes assigned to this section.</div>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
} 