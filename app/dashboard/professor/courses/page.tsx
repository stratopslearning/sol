import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { courses } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CopyEnrollmentButton from '@/components/CopyEnrollmentButton';
import { LogOut, BarChart2, FileText, BookOpen, Copy, User2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SignOutButton } from '@clerk/nextjs';

export default async function ProfessorCoursesPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  // Fetch professor's courses
  const professorCourses = await db.query.courses.findMany({
    where: eq(courses.professorId, user.id),
    with: {
      enrollments: true,
      quizzes: true,
    },
    orderBy: (courses, { desc }) => desc(courses.createdAt),
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
            <a href="/dashboard/professor/courses" className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"><BookOpen className="w-4 h-4" /> My Courses</a>
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
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Courses</h1>
                <p className="text-white/60 text-lg">View and manage your courses and enrollment codes</p>
              </div>
            </div>
          </section>

          {/* Courses Grid */}
          <section className="w-full max-w-6xl">
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 hover:shadow-2xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-white">Course Management</CardTitle>
              </CardHeader>
              <CardContent>
                {professorCourses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-white/40" />
                    <h3 className="text-lg font-medium text-white mb-2">No courses created yet</h3>
                    <p className="text-white/60 mb-6">Create your first course to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {professorCourses.map(course => (
                      <Card key={course.id} className="bg-white/5 border border-white/10">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            {course.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col gap-2">
                            <div className="text-white/80 text-sm">Enrollment Code:</div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-base text-blue-400 bg-blue-900/20 px-2 py-1 rounded select-all">{course.enrollmentCode}</span>
                              <CopyEnrollmentButton code={course.enrollmentCode} />
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-white/70 text-sm flex items-center gap-1">
                                <User2 className="w-4 h-4" />
                                {course.enrollments.length} student{course.enrollments.length === 1 ? '' : 's'}
                              </span>
                              <span className="text-white/70 text-sm flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {course.quizzes.length} quiz{course.quizzes.length === 1 ? '' : 'zes'}
                              </span>
                            </div>
                            <Button asChild variant="secondary" className="mt-2">
                              <a href={`/dashboard/professor/courses/${course.id}/gradebook`}>View Gradebook</a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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