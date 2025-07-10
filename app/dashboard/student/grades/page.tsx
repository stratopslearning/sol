import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { attempts, quizzes } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy, FileText, LogOut, BarChart2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';

export default async function GradesPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  // Fetch all attempts for this student
  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
    with: {
      quiz: true,
    },
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
          <div className="mb-8">
          <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
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
        <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8">
          <Card className="max-w-3xl w-full mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-white">My Grades & Attempt History</CardTitle>
            </CardHeader>
            <CardContent>
              {allAttempts.length === 0 ? (
                <div className="text-white/80 text-center py-12">No quiz attempts yet.</div>
              ) : (
                <div className="space-y-4">
                  {allAttempts.map((a) => (
                    <Card key={a.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg text-black dark:text-white">{a.quiz?.title || 'Quiz'}</CardTitle>
                          <div className="text-xs text-gray-400">{new Date(a.submittedAt!).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge variant={a.passed ? 'default' : 'destructive'}>
                            {a.passed ? 'Passed' : 'Failed'}
                          </Badge>
                          <Badge variant="outline">{a.percentage}%</Badge>
                          <Badge variant="outline">{a.score} / {a.maxScore}</Badge>
                          {a.passed ? <Trophy className="w-5 h-5 text-yellow-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      </CardHeader>
                      <CardContent className="flex gap-4 items-center">
                        <Button asChild variant="secondary">
                          <a href={`/quiz/${a.quizId}/review?attemptId=${a.id}`}>Review</a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
} 