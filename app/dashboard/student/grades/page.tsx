import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { sections, studentSections, quizzes, attempts, users } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, XCircle, FileText, BookOpen } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import StudentSidebar from '@/components/StudentSidebar';
import { SignOutButton } from '@clerk/nextjs';

export default async function GradesPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  // Fetch all attempts for this student, including quiz and section info
  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
    with: {
      quiz: true,
      section: {
        with: {
          course: true,
        },
      },
    },
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <StudentSidebar user={user} />
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8">
          {/* Header */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
              <div className="flex-1" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Grades</h1>
            <p className="text-white/60 text-lg">Track your academic performance</p>
          </section>
          <Card className="max-w-4xl w-full mb-8 bg-white/5 border border-white/10 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">My Grades & Attempt History</CardTitle>
            </CardHeader>
            <CardContent>
              {allAttempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/80">
                  <BookOpen className="w-12 h-12 mb-4 opacity-70" />
                  <div className="text-lg font-medium">No quiz attempts yet.</div>
                  <div className="text-sm text-gray-400 mt-1">Your grades will appear here after you complete a quiz.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {allAttempts.map((a) => {
                    const percentage = a.percentage ?? 0;
                    let badgeColor = 'bg-green-600';
                    if (percentage < 60) badgeColor = 'bg-red-600';
                    else if (percentage < 80) badgeColor = 'bg-yellow-500';
                    return (
                      <Card
                        key={a.id}
                        className="transition-shadow hover:shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl flex flex-col justify-between min-h-[220px]"
                      >
                        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                          <div>
                            <CardTitle className="text-lg text-black dark:text-white mb-1">{a.quiz?.title || 'Quiz'}</CardTitle>
                            <div className="text-xs text-gray-400 mb-1">
                              {a.section?.course?.title && (
                                <span className="font-semibold text-gray-300 mr-2">{a.section.course.title}</span>
                              )}
                              {a.submittedAt && new Date(a.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="text-xs">{a.score} / {a.maxScore}</Badge>
                            {a.passed ? <Trophy className="w-5 h-5 text-yellow-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-0">
                          <Progress value={percentage} className="h-2 bg-gray-200 dark:bg-gray-800" />
                          <Button asChild variant="secondary" className="w-full mt-2">
                            <a href={`/quiz/${a.quizId}/review?attemptId=${a.id}`}>Review</a>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
} 