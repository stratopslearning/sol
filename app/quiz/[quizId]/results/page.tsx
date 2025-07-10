import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { attempts, quizzes } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Trophy, FileText, LogOut, BarChart2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';

interface ResultsPageProps {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const p = await params;
  const sp = await searchParams;
  const attemptId = sp.attemptId;
  const user = await getOrCreateUser();
  if (!user) redirect('/login');

  if (!attemptId) {
    redirect('/dashboard/student');
  }

  // Fetch the attempt
  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
    with: {
      quiz: {
        with: {
          course: true,
        },
      },
    },
  });

  if (!attempt || attempt.studentId !== user.id) {
    redirect('/dashboard/student');
  }

  const quiz = attempt.quiz;

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
          <div className="mb-8">
            <div className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5" /> S-O-L</div>
            <div className="text-xs text-white/40">Student Dashboard</div>
          </div>
          <nav className="flex flex-col gap-2">
            <a href="/dashboard/student" className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"><BarChart2 className="w-4 h-4" /> Dashboard</a>
            <a href="/dashboard/student/grades" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><CheckCircle className="w-4 h-4" /> My Grades</a>
            <SignOutButton redirectUrl="/">
              <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </SignOutButton>
          </nav>
          <div className="mt-auto pt-8 flex flex-col gap-2">
            <div>
              <Badge className={user.paid ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-red-600/20 text-red-400 border-red-600'}>
                {user.paid ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
            <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center py-10 px-2 md:px-8 bg-gradient-to-br from-[#18181b] to-[#030303] min-h-screen">
          <Card className="max-w-xl mx-auto w-full shadow-2xl border-2 border-white/10 bg-[#18181b]/90">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {attempt.passed ? (
                  <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-lg" />
                ) : (
                  <XCircle className="w-20 h-20 text-red-500 drop-shadow-lg" />
                )}
              </div>
              <CardTitle className="text-3xl text-white font-bold">
                {attempt.passed ? 'Quiz Completed!' : 'Quiz Attempted'}
              </CardTitle>
              <p className="text-gray-300 mt-2 text-lg font-medium">{quiz.title}</p>
              <p className="text-gray-400">{quiz.course?.title}</p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="p-6 bg-white/10 border border-white/10 rounded-xl shadow-md">
                  <div className="text-3xl font-extrabold text-green-400 drop-shadow">{attempt.score}</div>
                  <div className="text-base text-gray-200 font-medium">Points Earned</div>
                </div>
                <div className="p-6 bg-white/10 border border-white/10 rounded-xl shadow-md">
                  <div className="text-3xl font-extrabold text-blue-400 drop-shadow">{attempt.maxScore}</div>
                  <div className="text-base text-gray-200 font-medium">Total Points</div>
                </div>
                <div className="p-6 bg-white/10 border border-white/10 rounded-xl shadow-md">
                  <div className="text-3xl font-extrabold text-yellow-400 drop-shadow">{attempt.percentage}%</div>
                  <div className="text-base text-gray-200 font-medium">Percentage</div>
                </div>
              </div>

              {/* Pass/Fail Status */}
              <div className="text-center mt-2">
                <Badge 
                  variant={attempt.passed ? 'default' : 'destructive'}
                  className={`text-2xl px-8 py-3 font-bold tracking-wide shadow-lg ${attempt.passed ? 'bg-green-600/80 text-white border-green-400' : 'bg-red-600/80 text-white border-red-400'}`}
                >
                  {attempt.passed ? (
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-7 h-7" />
                      <span>PASSED</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-7 h-7" />
                      <span>FAILED</span>
                    </div>
                  )}
                </Badge>
              </div>

              {/* Quiz Details */}
              <div className="space-y-2 text-base text-gray-300 font-medium">
                <div className="flex justify-between">
                  <span>Submitted:</span>
                  <span>{new Date(attempt.submittedAt!).toLocaleString()}</span>
                </div>
                {quiz.passingScore && (
                  <div className="flex justify-between">
                    <span>Passing Score:</span>
                    <span>{quiz.passingScore}%</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <Button asChild className="flex-1 text-lg font-semibold py-3">
                  <a href="/dashboard/student">Back to Dashboard</a>
                </Button>
                <Button variant="outline" asChild className="flex-1 text-lg font-semibold py-3">
                  <a href={`/quiz/${p.quizId}/review?attemptId=${attemptId}`}>
                    Review Answers
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
} 