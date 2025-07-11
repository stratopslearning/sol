import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, assignments, attempts, courses, courseEnrollments, users } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from '@/components/ui/sidebar';
import StudentSidebar from '@/components/StudentSidebar';
import { CheckCircle, LogOut, BarChart2, BookOpen, User2, FileText } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import StudentEnrollFormWrapper from '@/components/StudentEnrollFormWrapper';

function getStatusBadge(status: 'Open' | 'Completed' | 'Locked') {
  if (status === 'Open') return <Badge className="bg-green-600/20 text-green-400 border-green-600">Open</Badge>;
  if (status === 'Completed') return <Badge className="bg-gray-600/20 text-gray-300 border-gray-600">Completed</Badge>;
  return <Badge className="bg-red-600/20 text-red-400 border-red-600">Locked</Badge>;
}

export default async function StudentDashboard() {
  const user = await getOrCreateUser();
  if (!user) return null;

  // Fetch enrolled courses
  const enrollments = await db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.studentId, user.id),
    with: { course: { with: { professor: true } } },
  });
  const enrolledCourses = enrollments.map(e => e.course);
  const enrolledCourseIds = enrolledCourses.map(c => c.id);

  // Fetch quizzes for enrolled courses
  const courseQuizzes = enrolledCourseIds.length > 0
    ? await db.query.quizzes.findMany({
        where: inArray(quizzes.courseId, enrolledCourseIds),
        with: { course: true },
        orderBy: (quizzes, { desc }) => desc(quizzes.createdAt),
      })
    : [];

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
          {/* Welcome Header */}
          <section className="w-full max-w-4xl mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome back, {user.firstName || user.email}!</h1>
            <p className="text-white/60 text-lg">Here’s your learning overview</p>
          </section>
          {/* Enrollment Form */}
          <section className="w-full max-w-4xl mb-8">
            <StudentEnrollFormWrapper />
          </section>

          {/* My Courses Section */}
          <section className="w-full max-w-4xl mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><BookOpen className="w-6 h-6" /> My Courses</h2>
            {enrolledCourses.length === 0 ? (
              <Card className="bg-white/10 border border-white/10 text-center py-8">
                <CardContent>
                  <FileText className="w-10 h-10 mx-auto mb-2 text-white/40" />
                  <div className="text-white/60 text-lg mb-2">You are not enrolled in any courses yet.</div>
                  <div className="text-white/40 text-sm">Join a course using the enrollment code above.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {enrolledCourses.map(course => (
                  <Card key={course.id} className="bg-white/10 border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        {course.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-white/70 text-sm flex items-center gap-2">
                        <User2 className="w-4 h-4" />
                        Professor: {course.professor?.firstName || course.professor?.email || 'Unknown'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Available Quizzes Section */}
          <section className="w-full max-w-4xl mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-6 h-6" /> Available Quizzes</h2>
            {courseQuizzes.length === 0 ? (
              <Card className="bg-white/10 border border-white/10 text-center py-8">
                <CardContent>
                  <FileText className="w-10 h-10 mx-auto mb-2 text-white/40" />
                  <div className="text-white/60 text-lg mb-2">No quizzes available yet.</div>
                  <div className="text-white/40 text-sm">Check back later for new quizzes in your courses.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseQuizzes.map(quiz => {
                  const attempts = attemptsByQuiz[quiz.id] || [];
                  const hasAttempted = attempts.length > 0;
                  return (
                    <Card key={quiz.id} className="flex flex-col justify-between rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg text-white flex-1 truncate">{quiz.title}</CardTitle>
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600 ml-2">{quiz.course?.title}</Badge>
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
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 