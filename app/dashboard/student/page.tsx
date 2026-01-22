import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, assignments, attempts, sections, studentSections, users, quizSections } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StudentSidebar from '@/components/StudentSidebar';
import { 
  CalendarDays, 
  CheckCircle, 
  FileText, 
  LogOut, 
  BarChart2, 
  BookOpen,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import StudentEnrollFormWrapper from '@/components/StudentEnrollFormWrapper';
import { EnrollmentList } from '@/components/EnrollmentList';
import { AttemptList } from '@/components/AttemptList';

export default async function StudentDashboard() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  // Fetch student's section enrollments
  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: {
      section: true
    }
  });

  // Get section IDs for filtering
  const sectionIds = enrollments.map(e => e.sectionId);

  // Fetch quizzes assigned to student's sections (not individual student assignments)
  const availableQuizzes = sectionIds.length > 0 ? await db.query.quizzes.findMany({
    where: inArray(quizzes.id, 
      db.select({ quizId: quizSections.quizId })
        .from(quizSections)
        .where(inArray(quizSections.sectionId, sectionIds))
    ),
    with: {
      sectionAssignments: {
        with: {
          section: true
        }
      }
    }
  }) : [];

  // Filter to only show active quizzes
  const activeQuizzes = availableQuizzes.filter(quiz => quiz.isActive);

  // Deduplicate quizzes by ID to avoid counting the same quiz multiple times
  const uniqueActiveQuizzes = activeQuizzes.filter((quiz, index, self) => 
    index === self.findIndex(q => q.id === quiz.id)
  );

  // Fetch recent attempts
  const recentAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
    with: {
      quiz: true,
      section: true
    },
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
    limit: 5,
  });

  // Calculate stats
  const totalSections = enrollments.length;
  const totalQuizzes = uniqueActiveQuizzes.length;
  const totalAttempts = recentAttempts.length;
  const averageScore = totalAttempts > 0 
    ? Math.round(recentAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
    : 0;

  return (
    <div className="min-h-screen w-screen bg-[#030303] flex">
      {/* Sidebar */}
      <StudentSidebar user={user} />
      {/* Main Content */}
      <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
        <StudentEnrollFormWrapper />
        {/* Hero/Header */}
        <section className="w-full max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome back, {user.firstName || user.email}!</h1>
          <p className="text-white/60 text-lg">Here's your learning overview</p>
        </section>

          {/* Analytics Section */}
          <section className="w-full max-w-7xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Your Progress</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/15 transition-all duration-300 cursor-pointer group animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">Enrolled Sections</CardTitle>
                  <BookOpen className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{totalSections}</div>
                  <p className="text-xs text-white/40">Active sections</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/15 transition-all duration-300 cursor-pointer group animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">Available Quizzes</CardTitle>
                  <FileText className="h-4 w-4 text-green-400 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{totalQuizzes}</div>
                  <p className="text-xs text-white/40">Assigned quizzes</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/15 transition-all duration-300 cursor-pointer group animate-scale-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">Quiz Attempts</CardTitle>
                  <CheckCircle className="h-4 w-4 text-orange-400 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">{totalAttempts}</div>
                  <p className="text-xs text-white/40">Completed quizzes</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/15 transition-all duration-300 cursor-pointer group animate-scale-in" style={{ animationDelay: '0.3s' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">Avg Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">{averageScore}%</div>
                  <p className="text-xs text-white/40">Your average</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Enrolled Sections & Recent Activity */}
          <section className="w-full max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Your Sections & Recent Activity</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enrolled Sections */}
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-scale-in">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Enrolled Sections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <EnrollmentList enrollments={enrollments} />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader>
                  <CardTitle className="text-lg text-white">Recent Quiz Attempts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AttemptList attempts={recentAttempts} />
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    );
} 