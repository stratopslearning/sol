import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, questions, courses } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  LogOut, 
  BarChart2, 
  Users, 
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Eye
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { QuizEditForm } from '@/components/quiz/QuizEditForm';

export default async function EditQuizPage({ 
  params 
}: { 
  params: Promise<{ quizId: string }> 
}) {
  const { quizId } = await params;
  const user = await getOrCreateUser();
  
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch quiz with questions
  const quiz = await db.query.quizzes.findFirst({
    where: and(
      eq(quizzes.id, quizId),
      eq(quizzes.professorId, user.id)
    ),
    with: {
      questions: {
        orderBy: questions.order,
      },
      course: true,
    },
  });

  if (!quiz) {
    notFound();
  }

  // Fix options type for questions
  const safeQuestions = quiz.questions.map(q => ({
    ...q,
    options:
      Array.isArray(q.options)
        ? q.options
        : typeof q.options === 'string'
          ? (() => { try { const arr = JSON.parse(q.options); return Array.isArray(arr) ? arr : null; } catch { return null; } })()
          : null,
  }));

  // Fetch professor's courses for the form
  const professorCourses = await db.query.courses.findMany({
    where: eq(courses.professorId, user.id),
    orderBy: (courses, { asc }) => asc(courses.title),
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
          <div className="mb-8">
            <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
            <div className="text-xs text-white/40">Professor Dashboard</div>
          </div>
          <nav className="flex flex-col gap-2">
            <a href="/dashboard/professor" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><BarChart2 className="w-4 h-4" /> Dashboard</a>
            <a href="/dashboard/professor/quizzes" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><FileText className="w-4 h-4" /> My Quizzes</a>
            <SignOutButton redirectUrl="/">
              <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </SignOutButton>
          </nav>
          <div className="mt-auto pt-8 flex flex-col gap-2">
            <div>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">
                Professor
              </Badge>
            </div>
            <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8">
          {/* Header */}
          <section className="w-full max-w-6xl mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <Button asChild variant="ghost" size="sm">
                    <a href="/dashboard/professor/quizzes">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Quizzes
                    </a>
                  </Button>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Edit Quiz</h1>
                <p className="text-white/60 text-lg">Update quiz settings and questions</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-white/40 text-sm">Quiz:</span>
                  <span className="text-white font-medium">{quiz.title}</span>
                  {quiz.course && (
                    <>
                      <span className="text-white/40 text-sm">• Course:</span>
                      <span className="text-white/60 text-sm">{quiz.course.title}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`/dashboard/professor/quiz/${quiz.id}/results`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Results
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* Quiz Info Card */}
          <section className="w-full max-w-6xl mb-8">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-white">Quiz Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Status</div>
                    <Badge className={quiz.isActive ? "bg-green-600/20 text-green-400 border-green-600" : "bg-gray-600/20 text-gray-300 border-gray-600"}>
                      {quiz.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Questions</div>
                    <div className="text-lg font-bold text-white">{quiz.questions.length}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Max Attempts</div>
                    <div className="text-lg font-bold text-white">{quiz.maxAttempts}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/60 mb-1">Time Limit</div>
                    <div className="text-lg font-bold text-white">{quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}</div>
                  </div>
                </div>
                {quiz.description && (
                  <div className="mt-6">
                    <div className="text-sm font-medium text-white/60 mb-2">Description</div>
                    <p className="text-white/80">{quiz.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Edit Form */}
          <section className="w-full max-w-6xl">
            <QuizEditForm 
              quiz={{ ...quiz, questions: safeQuestions }}
              courses={professorCourses}
            />
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 