import { db } from '@/app/db';
import { sections, professorSections, studentSections, users, quizzes, quizSections } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ProfessorSidebar from '@/components/ProfessorSidebar';
import CopyEnrollmentButton from '@/components/CopyEnrollmentButton';
import LeaveSectionButton from './LeaveSectionButton';
import UnassignQuizButton from './UnassignQuizButton';

export default async function SectionDetailsPage({ params, searchParams }: any) {
  const resolvedParams = await params;
  const sectionId = resolvedParams.sectionId;
  // TODO: Replace with actual professor ID from auth context
  // For now, assume professor is authenticated and authorized

  // Fetch section with course info
  const section = await db.query.sections.findFirst({ where: eq(sections.id, sectionId), with: { course: true } });
  if (!section) return notFound();

  // Fetch students enrolled in this section
  const studentEnrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.sectionId, sectionId),
    with: { student: true },
  });
  const students = studentEnrollments.map(e => e.student);

  // Fetch professors enrolled in this section
  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.sectionId, sectionId),
    with: { professor: true },
  });
  const professors = professorEnrollments.map(e => e.professor);

  // Fetch quizzes assigned to this section
  const quizSectionAssignments = await db.query.quizSections.findMany({
    where: eq(quizSections.sectionId, sectionId),
    with: { quiz: true },
  });
  const sectionQuizzes = quizSectionAssignments.map(qs => qs.quiz);

  return (
    <div className="min-h-screen w-screen bg-[#030303] flex">
      <ProfessorSidebar active="sections" />
      <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8 overflow-x-hidden">
        <section className="w-full max-w-4xl mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Section Details</h1>
          <p className="text-white/60 text-lg mb-2">{section.name} {section.course ? `- ${section.course.title}` : ''}</p>
        </section>
        <section className="w-full max-w-4xl mb-8">
          <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-white">Section Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge className="bg-green-600/20 text-green-400 border-green-600">Section ID: {section.id}</Badge>
                  {section.course && (
                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Course: {section.course.title}</Badge>
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-6 mt-4">
                  <div className="flex-1">
                    <div className="text-white/80 text-sm mb-1">Professor Enrollment Code:</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base text-blue-400 bg-blue-900/20 px-2 py-1 rounded select-all">
                        {section.professorEnrollmentCode}
                      </span>
                      <CopyEnrollmentButton code={section.professorEnrollmentCode} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-white/80 text-sm mb-1">Student Enrollment Code:</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base text-green-400 bg-green-900/20 px-2 py-1 rounded select-all">
                        {section.studentEnrollmentCode}
                      </span>
                      <CopyEnrollmentButton code={section.studentEnrollmentCode} />
                    </div>
                  </div>
                </div>
                <LeaveSectionButton sectionId={section.id} />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Enrolled Students</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-white/10">
                {students.length === 0 ? (
                  <li className="py-4 text-white/60">No students enrolled in this section.</li>
                ) : (
                  students.map(student => (
                    <li key={student.id} className="py-4 flex items-center gap-4">
                      <span className="font-medium text-white">{student.firstName} {student.lastName}</span>
                      <span className="text-xs text-white/40">{student.email}</span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10 mt-8">
            <CardHeader>
              <CardTitle className="text-xl text-white">Quizzes Assigned to this Section</CardTitle>
            </CardHeader>
            <CardContent>
              {sectionQuizzes.length === 0 ? (
                <div className="text-white/60 py-4">No quizzes assigned to this section.</div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {sectionQuizzes.map(quiz => (
                    <li key={quiz.id} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-medium text-white">{quiz.title}</span>
                        <span className="ml-2 text-xs text-white/40">{quiz.description}</span>
                      </div>
                      <UnassignQuizButton quizId={quiz.id} sectionId={sectionId} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
