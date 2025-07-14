import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
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
  BookOpen
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';
import { QuizActions } from '@/components/quiz/QuizActions';

function getStatusBadge(status: 'Active' | 'Draft' | 'Closed') {
  if (status === 'Active') return <Badge className="bg-green-600/20 text-green-400 border-green-600">Active</Badge>;
  if (status === 'Draft') return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600">Draft</Badge>;
  return <Badge className="bg-gray-600/20 text-gray-300 border-gray-600">Closed</Badge>;
}

export default async function ProfessorQuizzesPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch professor's quizzes with sectionAssignments, attempts, and questions
  const professorQuizzes = await db.query.quizzes.findMany({
    where: eq(quizzes.professorId, user.id),
    with: {
      sectionAssignments: {
        with: {
          section: true,
        },
      },
      attempts: true,
      questions: true,
    },
    orderBy: (quizzes, { desc }) => desc(quizzes.createdAt),
  });

  // Calculate stats for each quiz
  const quizzesWithStats = professorQuizzes.map(quiz => {
    const totalAttempts = quiz.attempts.length;
    const uniqueStudents = new Set(quiz.attempts.map(a => a.studentId)).size;
    const averageScore = totalAttempts > 0 
      ? Math.round(quiz.attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
      : 0;
    
    return {
      ...quiz,
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
              <a href="/dashboard/professor/sections" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><BookOpen className="w-4 h-4" /> My Sections</a>
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
                <p className="text-white/60 text-lg">Manage and monitor your quiz performance</p>
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
                    {new Set(quizzesWithStats.flatMap(q => q.attempts.map(a => a.studentId))).size}
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
              <CardHeader>
                <CardTitle className="text-xl text-white">Quiz Management</CardTitle>
              </CardHeader>
              <CardContent>
                {quizzesWithStats.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-white/40" />
                    <h3 className="text-lg font-medium text-white mb-2">No quizzes created yet</h3>
                    <p className="text-white/60 mb-6">Create your first quiz to get started</p>
                    <Button asChild>
                      <a href="/dashboard/professor/quiz/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Quiz
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/60 font-medium">Quiz Title</TableHead>
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
                        {quizzesWithStats.map((quiz) => (
                          <TableRow key={quiz.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-medium text-white">
                              <div>
                                <div className="font-semibold">{quiz.title}</div>
                                <div className="text-xs text-white/60">
                                  {quiz.questions.length} questions
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              {quiz.sectionAssignments.length > 0
                                ? quiz.sectionAssignments.map(sa => sa.section.name).join(', ')
                                : 'No Section'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(quiz.isActive ? 'Active' : 'Draft')}
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {quiz.uniqueStudents}
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              {quiz.totalAttempts}
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                {quiz.averageScore}%
                              </div>
                            </TableCell>
                            <TableCell className="text-white/60 text-sm">
                              {new Date(quiz.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <QuizActions quizId={quiz.id} isActive={quiz.isActive} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 