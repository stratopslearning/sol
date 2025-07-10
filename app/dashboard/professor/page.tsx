import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, courses, attempts, users } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { 
  CalendarDays, 
  CheckCircle, 
  FileText, 
  LogOut, 
  BarChart2, 
  Plus, 
  Users, 
  BookOpen,
  TrendingUp,
  Clock
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import ExportResultsWrapper from '@/components/ExportResultsWrapper';

export default async function ProfessorDashboard() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch professor's courses
  const professorCourses = await db.query.courses.findMany({
    where: eq(courses.professorId, user.id),
  });

  // Fetch professor's quizzes (directly by professorId)
  const professorQuizzes = await db.query.quizzes.findMany({
    where: eq(quizzes.professorId, user.id),
    with: {
      course: true,
      attempts: true,
    }
  });

  // Fetch recent attempts for professor's quizzes
  const recentAttempts = await db.query.attempts.findMany({
    where: inArray(attempts.quizId, professorQuizzes.map(q => q.id)),
    with: {
      student: true,
      quiz: {
        with: { course: true }
      }
    },
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
    limit: 5,
  });

  // Calculate stats
  const activeQuizzes = professorQuizzes.filter(q => q.isActive).length;
  const draftQuizzes = professorQuizzes.filter(q => !q.isActive).length;
  const totalStudents = new Set(professorQuizzes.flatMap(q => q.attempts.map(a => a.studentId))).size;
  const totalAttempts = professorQuizzes.reduce((sum, q) => sum + q.attempts.length, 0);
  const averageScore = totalAttempts > 0 
    ? Math.round(professorQuizzes.reduce((sum, q) => 
        sum + q.attempts.reduce((quizSum, a) => quizSum + (a.percentage || 0), 0), 0) / totalAttempts)
    : 0;

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
            <a href="/dashboard/professor" className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"><BarChart2 className="w-4 h-4" /> Dashboard</a>
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
          {/* Hero/Header */}
          <section className="w-full max-w-4xl mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome back, Professor {user.firstName || user.email}!</h1>
            <p className="text-white/60 text-lg">Here's your teaching overview</p>
          </section>

          {/* Export Results Section */}
          <ExportResultsWrapper quizzes={professorQuizzes} />

          {/* Stats Cards */}
          <section className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/60">Active Quizzes</CardTitle>
                <FileText className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{activeQuizzes}</div>
                <p className="text-xs text-white/40">Live quizzes</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/60">Draft Quizzes</CardTitle>
                <FileText className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">{draftQuizzes}</div>
                <p className="text-xs text-white/40">Inactive quizzes</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/60">Total Students</CardTitle>
                <Users className="h-4 w-4 text-white/40" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{totalStudents}</div>
                <p className="text-xs text-white/40">Enrolled students</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/60">Total Attempts</CardTitle>
                <CheckCircle className="h-4 w-4 text-white/40" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{totalAttempts}</div>
                <p className="text-xs text-white/40">Quiz submissions</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/60">Avg Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-white/40" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{averageScore}%</div>
                <p className="text-xs text-white/40">Class average</p>
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section className="w-full max-w-4xl mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1">
                <a href="/dashboard/professor/quiz/new" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Quiz
                </a>
              </Button>
              <Button asChild variant="secondary" className="flex-1">
                <a href="/dashboard/professor/quizzes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Manage Quizzes
                </a>
              </Button>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Quiz Submissions */}
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentAttempts.length > 0 ? (
                    recentAttempts.map(attempt => (
                      <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">
                            {attempt.student.firstName} {attempt.student.lastName}
                          </div>
                          <div className="text-xs text-white/60">
                            {attempt.quiz.title} • {attempt.percentage}%
                          </div>
                        </div>
                        <Badge className={attempt.passed ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-red-600/20 text-red-400 border-red-600'}>
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-white/40">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No recent submissions</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Quizzes */}
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Your Quizzes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {professorQuizzes.slice(0, 5).map(quiz => (
                    <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{quiz.title}</div>
                        <div className="text-xs text-white/60">
                          {quiz.course ? quiz.course.title : 'Global Quiz'} • {quiz.attempts.length} attempts
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <a href={`/dashboard/professor/quiz/${quiz.id}/results`}>
                          View Results
                        </a>
                      </Button>
                    </div>
                  ))}
                  {professorQuizzes.length === 0 && (
                    <div className="text-center py-6 text-white/40">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No quizzes created yet</p>
                      <Button
                        asChild
                        variant="secondary"
                        size="lg"
                        className="mt-4 shadow rounded-lg font-semibold min-w-[180px] h-12 text-base flex items-center justify-center gap-2"
                      >
                        <a href="/dashboard/professor/quiz/new">
                          <Plus className="w-5 h-5 mr-2" />
                          Create Your First Quiz
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 