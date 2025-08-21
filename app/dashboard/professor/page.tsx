import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, professorSections, quizzes, attempts, users } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import ProfessorSidebar from '@/components/ProfessorSidebar';
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
  Clock,
  Download
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import ExportResultsWrapper from '@/components/ExportResultsWrapper';
import ProfessorEnrollForm from '@/components/ProfessorEnrollForm';

export default async function ProfessorDashboard() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch professor's section enrollments
  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: {
        with: {
          course: true
        }
      }
    }
  });

  // Get section IDs for filtering
  const sectionIds = professorEnrollments.map(e => e.sectionId);

  // Fetch professor's quizzes (created by professor)
  const professorQuizzes = await db.query.quizzes.findMany({
    where: eq(quizzes.professorId, user.id),
    with: {
      sectionAssignments: {
        with: {
          section: {
            with: {
              course: true
            }
          }
        }
      },
      attempts: true,
    }
  });

  // Fetch recent attempts for professor's quizzes
  const recentAttempts = await db.query.attempts.findMany({
    where: inArray(attempts.quizId, professorQuizzes.map(q => q.id)),
    with: {
      student: true,
      quiz: {
        with: { 
          sectionAssignments: {
            with: {
              section: {
                with: {
                  course: true
                }
              }
            }
          }
        }
      },
      section: {
        with: {
          course: true
        }
      }
    },
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
    limit: 5,
  });

  // Calculate stats
  const totalSections = professorEnrollments.length;
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
        <ProfessorSidebar active="dashboard" />
        {/* Main Content */}
        <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
          <ProfessorEnrollForm />
          {/* Hero/Header */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
              <div className="flex-1" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome back, {user.firstName || user.email}!</h1>
            <p className="text-white/60 text-lg">Here's your teaching overview</p>
          </section>

          {/* Analytics Section - Top */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Analytics Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Enrolled Sections</CardTitle>
                  <BookOpen className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{totalSections}</div>
                  <p className="text-xs text-white/40">Your sections</p>
                </CardContent>
              </Card>

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
                  <Users className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{totalStudents}</div>
                  <p className="text-xs text-white/40">Enrolled students</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Total Attempts</CardTitle>
                  <CheckCircle className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">{totalAttempts}</div>
                  <p className="text-xs text-white/40">Quiz submissions</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Avg Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">{averageScore}%</div>
                  <p className="text-xs text-white/40">Class average</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Course & Quiz Creation Section - Side by Side */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quiz Creation */}
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Quiz Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="flex items-center gap-2 w-full">
                    <a href="/dashboard/professor/quiz/new">
                      <Plus className="w-4 h-4" />
                      Create New Quiz
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="flex items-center gap-2 w-full">
                    <a href="/dashboard/professor/quiz-results">
                      <TrendingUp className="w-4 h-4" />
                      View All Results
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Recent Activity & Export Section - Bottom */}
          <section className="w-full max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Activity & Data Export</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
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
                            {attempt.quiz.title} • {attempt.section.course.title} • {attempt.percentage}%
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

              {/* Export Results */}
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Quiz Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/60 text-sm mb-4">Export student results as CSV files</p>
                  <ExportResultsWrapper quizzes={professorQuizzes} />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Your Quizzes Section */}
          <section className="w-full max-w-7xl mx-auto mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Your Quizzes</h2>
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {professorQuizzes.slice(0, 5).map(quiz => (
                    <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{quiz.title}</div>
                        <div className="text-xs text-white/60">
                          {quiz.sectionAssignments[0]?.section.course.title || 'No Course'} • {quiz.attempts.length} attempts
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
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 