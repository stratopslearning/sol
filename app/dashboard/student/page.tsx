import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, assignments, attempts } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { CalendarDays, CheckCircle, Lock, FileText, LogOut, MessageCircle, BarChart2 } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

function getStatusBadge(status: 'Open' | 'Completed' | 'Locked') {
  if (status === 'Open') return <Badge className="bg-green-600/20 text-green-400 border-green-600">Open</Badge>;
  if (status === 'Completed') return <Badge className="bg-gray-600/20 text-gray-300 border-gray-600">Completed</Badge>;
  return <Badge className="bg-red-600/20 text-red-400 border-red-600">Locked</Badge>;
}

export default async function StudentDashboard() {
  const user = await getOrCreateUser();
  if (!user) return null;

  // Fetch all active quizzes
  const allQuizzes = await db.select().from(quizzes).where(eq(quizzes.isActive, true));
  // Fetch all attempts for this student
  const allAttempts = await db.select().from(attempts).where(eq(attempts.studentId, user.id));

  // Map attempts by quizId
  const attemptsByQuiz: Record<string, typeof allAttempts[0][]> = {};
  allAttempts.forEach(a => {
    if (!attemptsByQuiz[a.quizId]) attemptsByQuiz[a.quizId] = [];
    attemptsByQuiz[a.quizId].push(a);
  });

  // Remove mock data logic

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
          {/* Hero/Header */}
          <section className="w-full max-w-4xl mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome back, {user.firstName || user.email}!</h1>
            <p className="text-white/60 text-lg">Here are your available quizzes</p>
          </section>

          {/* Quiz Card Grid */}
          <section className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allQuizzes.map(quiz => {
              const attempts = attemptsByQuiz[quiz.id] || [];
              const hasAttempted = attempts.length > 0;
              return (
                <Card key={quiz.id} className="flex flex-col justify-between rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg text-white flex-1 truncate">{quiz.title}</CardTitle>
                    {/* Optionally, show status badge */}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {hasAttempted ? 'Attempted' : 'Not Attempted'}
                    </div>
                  </CardContent>
                  <div className="flex-1" />
                  <div className="p-4 pt-0 flex gap-2">
                    {!hasAttempted && (
                      <Button asChild className="w-full">
                        <a href={`/quiz/${quiz.id}`}>Start Quiz</a>
                      </Button>
                    )}
                    {hasAttempted && attempts.length > 0 && (
                      <Button asChild variant="secondary" className="w-full">
                        <a href={`/quiz/${quiz.id}/results?attemptId=${attempts[attempts.length - 1]?.id}`}>
                          Review
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 