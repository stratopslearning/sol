import { db } from '@/app/db';
import { sections, studentSections, users, quizzes, quizSections, attempts } from '@/app/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ExportResultsWrapper from '@/components/ExportResultsWrapper';
import ProfessorSidebar from '@/components/ProfessorSidebar';

export default async function SectionGradebookPage({ params }: any) {
  const resolvedParams = await params;
  const sectionId = resolvedParams.sectionId;

  // Fetch section
  const section = await db.query.sections.findFirst({ where: eq(sections.id, sectionId), with: { course: true } });
  if (!section) return notFound();

  // Fetch students enrolled in this section
  const studentEnrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.sectionId, sectionId),
    with: { student: true },
  });
  const students = studentEnrollments.map(e => e.student);

  // Fetch quizzes assigned to this section
  const quizSectionAssignments = await db.query.quizSections.findMany({
    where: eq(quizSections.sectionId, sectionId),
    with: { quiz: true },
  });
  const sectionQuizzes = quizSectionAssignments.map(qs => qs.quiz);
  const quizIds = sectionQuizzes.map(q => q.id);

  // Fetch all attempts for these students/quizzes
  const studentIds = students.map(s => s.id);
  let allAttempts: any[] = [];
  if (studentIds.length && quizIds.length) {
    allAttempts = await db.query.attempts.findMany({
      where: and(
        inArray(attempts.studentId, studentIds),
        inArray(attempts.quizId, quizIds)
      ),
      with: { student: true, quiz: true },
    });
  }

  // Calculate per-student, per-quiz scores
  const studentQuizScores: Record<string, Record<string, { score: number; percentage: number; attemptId: string; maxScore: number }>> = {};
  allAttempts.forEach(attempt => {
    if (!studentQuizScores[attempt.studentId]) studentQuizScores[attempt.studentId] = {};
    studentQuizScores[attempt.studentId][attempt.quizId] = {
      score: attempt.score,
      percentage: attempt.percentage,
      attemptId: attempt.id,
      maxScore: attempt.maxScore,
    };
  });

  // Calculate averages
  const quizAverages = sectionQuizzes.map(quiz => {
    const attemptsForQuiz = allAttempts.filter(a => a.quizId === quiz.id);
    const avg = attemptsForQuiz.length > 0 ? Math.round(attemptsForQuiz.reduce((sum, a) => sum + (a.percentage || 0), 0) / attemptsForQuiz.length) : 0;
    return { quizId: quiz.id, average: avg };
  });

  return (
    <div className="min-h-screen w-screen bg-[#030303] flex">
      {/* Sidebar */}
      <ProfessorSidebar active="sections" />
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center py-10 px-2 md:px-8 overflow-x-hidden">
        <section className="w-full max-w-6xl mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Section Gradebook</h1>
          <p className="text-white/60 text-lg mb-2">{section.name} {section.course ? `- ${section.course.title}` : ''}</p>
        </section>
        <section className="w-full max-w-6xl mb-8">
          <ExportResultsWrapper quizzes={sectionQuizzes.map(q => ({ id: q.id, title: q.title }))} />
        </section>
        <section className="w-full max-w-6xl">
          <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Student Grades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-white">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Student</th>
                      {sectionQuizzes.map(quiz => (
                        <th key={quiz.id} className="px-4 py-2 text-left">{quiz.title}</th>
                      ))}
                      <th className="px-4 py-2 text-left">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const scores = sectionQuizzes.map(quiz => studentQuizScores[student.id]?.[quiz.id]?.score ?? '-');
                      // Remove avg percentage calculation
                      return (
                        <tr key={student.id} className="border-t border-white/10">
                          <td className="px-4 py-2">{student.firstName} {student.lastName}</td>
                          {sectionQuizzes.map(quiz => (
                            <td key={quiz.id} className="px-4 py-2">
                              {studentQuizScores[student.id]?.[quiz.id]?.score !== undefined
                                ? `${studentQuizScores[student.id][quiz.id].score} / ${studentQuizScores[student.id][quiz.id].maxScore}`
                                : '-'}
                            </td>
                          ))}
                          {/* Remove avg column */}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/20">
                      <td className="px-4 py-2 font-bold">Quiz Avg</td>
                      {quizAverages.map(q => (
                        <td key={q.quizId} className="px-4 py-2 font-bold">{q.average}%</td>
                      ))}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
} 