import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { courseEnrollments, courses, users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from '@/components/ui/sidebar';
import StudentSidebar from '@/components/StudentSidebar';
import { BookOpen, User2, FileText, LogOut, BarChart2, CheckCircle } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

export default async function StudentCoursesPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  // Fetch enrolled courses with professor info
  const enrollments = await db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.studentId, user.id),
    with: { course: { with: { professor: true } } },
  });
  const enrolledCourses = enrollments.map(e => e.course);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-screen bg-[#030303] flex">
        {/* Sidebar */}
        <StudentSidebar user={user} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8">
          <section className="w-full max-w-4xl mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Courses</h1>
            <p className="text-white/60 text-lg">All your enrolled courses in one place</p>
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
                      <div className="text-white/70 text-sm flex items-center gap-2 mb-2">
                        <User2 className="w-4 h-4" />
                        Professor: {course.professor?.firstName || course.professor?.email || 'Unknown'}
                      </div>
                      {course.description && (
                        <div className="text-white/50 text-sm mb-2">{course.description}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
} 