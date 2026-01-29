import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { attempts } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import StudentSidebar from '@/components/StudentSidebar';
import StudentGradesTableClient from './StudentGradesTableClient';

export default async function StudentGradesPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
    orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
    with: {
      quiz: true,
      section: {
        with: { course: true },
      },
    },
  });

  const attemptRows = allAttempts.map(a => ({
    id: a.id,
    quizId: a.quizId,
    quizTitle: a.quiz?.title ?? 'Quiz',
    courseTitle: a.section?.course?.title ?? null,
    submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : null,
    score: a.score,
    maxScore: a.maxScore,
    percentage: a.percentage,
    passed: a.passed,
  }));

  return (
    <div className="min-h-screen w-screen bg-[#030303] flex">
      <StudentSidebar user={user} />
      <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
        <section className="w-full max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Grades</h1>
          <p className="text-white/60 text-lg">Track your academic performance</p>
        </section>
        <section className="w-full max-w-7xl mx-auto">
          <StudentGradesTableClient attempts={attemptRows} />
        </section>
      </main>
    </div>
  );
}
