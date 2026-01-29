import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, professorSections, quizSections } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText, 
  LogOut, 
  BarChart2, 
  Users, 
  Plus, 
  TrendingUp,
  Clock,
  Layers
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';
import { QuizActions } from '@/components/quiz/QuizActions';
import ProfessorQuizzesTableClient from './ProfessorQuizzesTableClient';

function getStatusBadge(status: 'Active' | 'Draft' | 'Closed') {
  if (status === 'Active') return <Badge className="bg-green-600/20 text-green-400 border-green-600">Active</Badge>;
  if (status === 'Draft') return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600">Draft</Badge>;
  return <Badge className="bg-gray-600/20 text-gray-300 border-gray-600">Closed</Badge>;
}

export default async function ProfessorQuizzesPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  // First, get all sections the professor is enrolled in
  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: true,
    },
  });

  const enrolledSectionIds = professorEnrollments.map(e => e.sectionId);

  // Fetch all quizzes assigned to the professor's enrolled sections
  const sectionQuizzes = await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, enrolledSectionIds),
    with: {
      quiz: {
        with: {
          sectionAssignments: {
            with: {
              section: true,
            },
          },
          attempts: true,
          questions: true,
          professor: true, // Include professor info to distinguish created vs assigned
        },
      },
    },
    orderBy: (quizSections, { desc }) => desc(quizSections.assignedAt),
  });

  // Dedupe: one row per quiz (same quiz can appear in multiple sectionQuizzes)
  const seenQuizIds = new Set<string>();
  const uniqueQuizzes = sectionQuizzes
    .map(qs => qs.quiz)
    .filter(quiz => {
      if (seenQuizIds.has(quiz.id)) return false;
      seenQuizIds.add(quiz.id);
      return true;
    });

  // Calculate stats for each quiz: only submitted; average = avg of each student's BEST score on this quiz
  const quizzesWithStats = uniqueQuizzes.map(quiz => {
    const isCreatedByProfessor = quiz.professorId === user.id;
    const submitted = quiz.attempts.filter((a) => a.submittedAt != null);
    const totalAttempts = submitted.length;
    const uniqueStudents = new Set(submitted.map((a) => a.studentId)).size;
    // Best percentage per student for this quiz
    const bestPerStudent: Record<string, number> = {};
    submitted.forEach((a) => {
      const pct = a.percentage ?? (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0);
      if (bestPerStudent[a.studentId] == null || pct > bestPerStudent[a.studentId]) bestPerStudent[a.studentId] = pct;
    });
    const bestPercentages = Object.values(bestPerStudent);
    const averageScore =
      bestPercentages.length > 0
        ? Math.round(bestPercentages.reduce((sum, p) => sum + p, 0) / bestPercentages.length)
        : 0;

    return {
      ...quiz,
      isCreatedByProfessor,
      submittedAttempts: submitted,
      totalAttempts,
      uniqueStudents,
      averageScore,
    };
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
              <a href="/dashboard/professor/sections" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><Layers className="w-4 h-4" /> My Sections</a>
              <a href="/dashboard/professor/quizzes" className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"><FileText className="w-4 h-4" /> My Quizzes</a>
              <a href="/dashboard/professor/quiz-results" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><TrendingUp className="w-4 h-4" /> All Results</a>
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
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Quizzes</h1>
                <p className="text-white/60 text-lg">View and manage all quizzes from your enrolled sections</p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex items-center gap-2">
                  <a href="/dashboard/professor/quiz-results">
                    <TrendingUp className="w-4 h-4" />
                    View All Results
                  </a>
                </Button>
                <Button asChild className="flex items-center gap-2">
                  <a href="/dashboard/professor/quiz/new">
                    <Plus className="w-4 h-4" />
                    Create New Quiz
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* Stats Overview */}
          <section className="w-full max-w-6xl mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Total Quizzes</CardTitle>
                  <FileText className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{quizzesWithStats.length}</div>
                  <p className="text-xs text-white/40">Created quizzes</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Total Attempts</CardTitle>
                  <TrendingUp className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {quizzesWithStats.reduce((sum, q) => sum + q.totalAttempts, 0)}
                  </div>
                  <p className="text-xs text-white/40">Student submissions</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Active Students</CardTitle>
                  <Users className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {new Set(quizzesWithStats.flatMap(q => q.submittedAttempts.map(a => a.studentId))).size}
                  </div>
                  <p className="text-xs text-white/40">Engaged students</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Avg Performance</CardTitle>
                  <Clock className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {quizzesWithStats.length > 0 
                      ? Math.round(quizzesWithStats.reduce((sum, q) => sum + q.averageScore, 0) / quizzesWithStats.length)
                      : 0}%
                  </div>
                  <p className="text-xs text-white/40">Class average</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Quizzes Table */}
          <section className="w-full max-w-6xl">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
            <ProfessorQuizzesTableClient
              quizzesWithStats={quizzesWithStats}
              sections={professorEnrollments.map(e => ({ id: e.section.id, name: e.section.name }))}
            />
          </Card>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 