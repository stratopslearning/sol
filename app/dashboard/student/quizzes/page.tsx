import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { courseEnrollments, quizzes, attempts, courses, users } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from '@/components/ui/sidebar';
import StudentSidebar from '@/components/StudentSidebar';
import { BookOpen, FileText, CheckCircle, LogOut, BarChart2 } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

export default async function StudentQuizzesPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  // Fetch enrolled courses with quizzes
  const enrollments = await db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.studentId, user.id),
    with: { course: { with: { quizzes: true } } },
  });
  const enrolledCourses = enrollments.map(e => e.course);
  const enrolledCourseIds = enrolledCourses.map(c => c.id);

  // Fetch all attempts for this student
  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
  });
  // Map attempts by quizId
  const attemptsByQuiz: Record<string, typeof allAttempts[0][]> = {};
  allAttempts.forEach(a => {
    if (!attemptsByQuiz[a.quizId]) attemptsByQuiz[a.quizId] = [];
    attemptsByQuiz[a.quizId].push(a);
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <StudentSidebar user={user} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8">
          <section className="w-full max-w-4xl mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Quizzes</h1>
            <p className="text-white/60 text-lg">All your available quizzes, grouped by course</p>
          </section>
          <section className="w-full max-w-4xl">
            {enrolledCourses.length === 0 ? (
              <Card className="bg-white/10 border border-white/10 text-center py-8">
                <CardContent>
                  <FileText className="w-10 h-10 mx-auto mb-2 text-white/40" />
                  <div className="text-white/60 text-lg mb-2">You are not enrolled in any courses yet.</div>
                  <div className="text-white/40 text-sm">Join a course using the enrollment code from your dashboard.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-10">
                {enrolledCourses.map(course => (
                  <div key={course.id}>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" /> {course.title}</h2>
                    {course.quizzes.length === 0 ? (
                      <Card className="bg-white/10 border border-white/10 text-center py-6 mb-6">
                        <CardContent>
                          <div className="text-white/60 text-base">No quizzes available for this course yet.</div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                        {course.quizzes.map(quiz => {
                          const attempts = attemptsByQuiz[quiz.id] || [];
                          const hasAttempted = attempts.length > 0;
                          return (
                            <Card key={quiz.id} className="flex flex-col justify-between rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                              <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg text-white flex-1 truncate">{quiz.title}</CardTitle>
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 