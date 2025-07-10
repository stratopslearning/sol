import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, attempts, questions, users } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
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
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Calendar,
  Target
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

export default async function QuizResultsPage({ 
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

  // Fetch all attempts for this quiz
  const quizAttempts = await db.query.attempts.findMany({
    where: eq(attempts.quizId, quizId),
    with: {
      student: true,
    },
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
  });

  // Calculate statistics
  const totalAttempts = quizAttempts.length;
  const uniqueStudents = new Set(quizAttempts.map(a => a.studentId)).size;
  const averageScore = totalAttempts > 0 
    ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
    : 0;
  const passedAttempts = quizAttempts.filter(a => a.passed).length;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

  // Question analysis
  const questionStats = quiz.questions.map(question => {
    const questionAttempts = quizAttempts.filter(a => 
      a.answers && typeof a.answers === 'string' && 
      JSON.parse(a.answers).some((ans: any) => ans.questionId === question.id)
    );
    
    const correctAnswers = questionAttempts.filter(a => {
      const answers = JSON.parse(a.answers as string);
      const answer = answers.find((ans: any) => ans.questionId === question.id);
      return answer && answer.isCorrect;
    }).length;
    
    const questionSuccessRate = questionAttempts.length > 0 
      ? Math.round((correctAnswers / questionAttempts.length) * 100)
      : 0;
    
    return {
      ...question,
      attempts: questionAttempts.length,
      correctAnswers,
      successRate: questionSuccessRate,
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
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{quiz.title}</h1>
                <p className="text-white/60 text-lg">Quiz Results & Analytics</p>
                {quiz.course && (
                  <p className="text-white/40 text-sm mt-1">Course: {quiz.course.title}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </div>
          </section>

          {/* Overview Stats */}
          <section className="w-full max-w-6xl mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Total Attempts</CardTitle>
                  <FileText className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{totalAttempts}</div>
                  <p className="text-xs text-white/40">Student submissions</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Unique Students</CardTitle>
                  <Users className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{uniqueStudents}</div>
                  <p className="text-xs text-white/40">Active participants</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Average Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{averageScore}%</div>
                  <p className="text-xs text-white/40">Class performance</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">Pass Rate</CardTitle>
                  <Target className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{passRate}%</div>
                  <p className="text-xs text-white/40">Students who passed</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Student Attempts Table */}
          <section className="w-full max-w-6xl mb-8">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-white">Student Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                {quizAttempts.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-white/40" />
                    <h3 className="text-lg font-medium text-white mb-2">No attempts yet</h3>
                    <p className="text-white/60">Students haven't taken this quiz yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/60 font-medium">Student</TableHead>
                          <TableHead className="text-white/60 font-medium">Score</TableHead>
                          <TableHead className="text-white/60 font-medium">Status</TableHead>
                          <TableHead className="text-white/60 font-medium">Submitted</TableHead>
                          <TableHead className="text-white/60 font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quizAttempts.map((attempt) => (
                          <TableRow key={attempt.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-medium text-white">
                              <div>
                                <div className="font-semibold">
                                  {attempt.student.firstName} {attempt.student.lastName}
                                </div>
                                <div className="text-xs text-white/60">
                                  {attempt.student.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold">{attempt.percentage}%</div>
                                <div className="text-xs text-white/40">
                                  ({attempt.score}/{attempt.maxScore})
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {attempt.passed ? (
                                <Badge className="bg-green-600/20 text-green-400 border-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Passed
                                </Badge>
                              ) : (
                                <Badge className="bg-red-600/20 text-red-400 border-red-600">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-white/60 text-sm">
                              {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Button asChild variant="ghost" size="sm">
                                <a href={`/dashboard/professor/attempt/${attempt.id}`}>
                                  <Eye className="w-4 h-4" />
                                </a>
                              </Button>
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

          {/* Question Analysis */}
          <section className="w-full max-w-6xl">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-white">Question Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {questionStats.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-white/40" />
                    <h3 className="text-lg font-medium text-white mb-2">No questions found</h3>
                    <p className="text-white/60">This quiz has no questions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/60 font-medium">Question</TableHead>
                          <TableHead className="text-white/60 font-medium">Type</TableHead>
                          <TableHead className="text-white/60 font-medium">Attempts</TableHead>
                          <TableHead className="text-white/60 font-medium">Success Rate</TableHead>
                          <TableHead className="text-white/60 font-medium">Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questionStats.map((question, index) => (
                          <TableRow key={question.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-medium text-white">
                              <div>
                                <div className="font-semibold">Q{index + 1}</div>
                                <div className="text-sm text-white/60 max-w-md truncate">
                                  {question.question}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">
                                {question.type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white/80">
                              {question.attempts}
                            </TableCell>
                            <TableCell className="text-white/80">
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold">{question.successRate}%</div>
                                <div className="text-xs text-white/40">
                                  ({question.correctAnswers}/{question.attempts})
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-white/80">
                              {question.points}
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