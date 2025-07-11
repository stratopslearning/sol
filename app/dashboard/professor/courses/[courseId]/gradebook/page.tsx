import { db } from '@/app/db';
import { courses, courseEnrollments, users, quizzes, attempts } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import GradebookCard from './GradebookCard';
import { BarChart2, BookOpen, FileText, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignOutButton } from '@clerk/nextjs';

export default async function GradebookPage({ params }: any) {
  const resolvedParams = await params;
  const courseId = resolvedParams.courseId;

  // Fetch course
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });
  if (!course) return notFound();

  // Fetch enrolled students
  const enrollments = await db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.courseId, courseId),
    with: { student: true },
  });
  const students = enrollments.map(e => e.student);

  // Fetch quizzes for this course
  const courseQuizzes = await db.query.quizzes.findMany({ where: eq(quizzes.courseId, courseId) });

  // Fetch all attempts for these students/quizzes
  const studentIds = students.map(s => s.id);
  const quizIds = courseQuizzes.map(q => q.id);
  let allAttempts: any[] = [];
  if (studentIds.length && quizIds.length) {
    allAttempts = await db.query.attempts.findMany({
      where: and(
        inArray(attempts.studentId, studentIds),
        inArray(attempts.quizId, quizIds)
      ),
    });
  }

  return (
    <div className="flex min-h-screen w-screen bg-[#030303]">
      {/* Sidebar (copied from main professor dashboard) */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex-col p-6">
        <div className="mb-8">
          <a href="/" className="text-lg font-bold text-white flex items-center gap-2 hover:underline">S-O-L</a>
          <div className="text-xs text-white/40">Professor Dashboard</div>
        </div>
        <nav className="flex flex-col gap-2">
          <a href="/dashboard/professor" className="flex items-center gap-2 text-white/90 hover:bg-white/10 rounded px-3 py-2 font-medium"><BarChart2 className="w-4 h-4" /> Dashboard</a>
          <a href="/dashboard/professor/courses" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><BookOpen className="w-4 h-4" /> My Courses</a>
          <a href="/dashboard/professor/quizzes" className="flex items-center gap-2 text-white/80 hover:bg-white/10 rounded px-3 py-2"><FileText className="w-4 h-4" /> My Quizzes</a>
          <SignOutButton redirectUrl="/">
            <button className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 rounded px-3 py-2 mt-8 w-full text-left">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </SignOutButton>
        </nav>
        <div className="mt-auto pt-8 flex flex-col gap-2">
          <div>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Professor</Badge>
          </div>
          <div className="text-xs text-white/30">&copy; {new Date().getFullYear()} S-O-L</div>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-10 px-2 md:px-8">
        <GradebookCard
          course={course}
          students={students.map(s => ({
            ...s,
            firstName: s.firstName ?? undefined,
            lastName: s.lastName ?? undefined,
          }))}
          quizzes={courseQuizzes}
          attempts={allAttempts}
        />
      </main>
    </div>
  );
} 