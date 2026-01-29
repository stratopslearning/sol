import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { studentSections, attempts, quizSections } from '@/app/db/schema';
import { eq, inArray } from 'drizzle-orm';
import StudentSidebar from '@/components/StudentSidebar';
import StudentQuizzesTableClient from './StudentQuizzesTableClient';

export default async function StudentQuizzesPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  const enrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.studentId, user.id),
    with: { section: true },
  });

  const sectionIds = enrollments.map(e => e.sectionId);

  const quizAssignments = sectionIds.length > 0 ? await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, sectionIds),
    with: {
      quiz: {
        with: {
          sectionAssignments: {
            with: { section: true },
          },
        },
      },
    },
  }) : [];

  const assignedQuizzes = quizAssignments
    .map(qa => qa.quiz)
    .filter((quiz, index, self) => index === self.findIndex(q => q.id === quiz.id));

  const allAttempts = await db.query.attempts.findMany({
    where: eq(attempts.studentId, user.id),
  });

  const attemptsByQuiz: Record<string, typeof allAttempts> = {};
  const bestAttemptByQuiz: Record<string, (typeof allAttempts)[0]> = {};
  allAttempts.forEach(a => {
    if (!attemptsByQuiz[a.quizId]) attemptsByQuiz[a.quizId] = [];
    attemptsByQuiz[a.quizId].push(a);
    if (a.submittedAt == null) return;
    const pct = a.percentage ?? (a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0);
    const existing = bestAttemptByQuiz[a.quizId];
    if (!existing) {
      bestAttemptByQuiz[a.quizId] = a;
    } else {
      const existingPct = existing.percentage ?? (existing.maxScore ? Math.round(((existing.score ?? 0) / existing.maxScore) * 100) : 0);
      if (pct > existingPct) bestAttemptByQuiz[a.quizId] = a;
    }
  });

  const quizzes = assignedQuizzes.map(quiz => ({
    id: quiz.id,
    title: quiz.title,
    endDate: quiz.endDate,
    maxAttempts: quiz.maxAttempts ?? 1,
    sectionNames: (quiz.sectionAssignments ?? [])
      .map(sa => sa.section?.name)
      .filter((n): n is string => Boolean(n)),
  }));

  const attemptCountByQuizId: Record<string, number> = {};
  const bestPercentageByQuizId: Record<string, number> = {};
  const latestAttemptIdByQuizId: Record<string, string> = {};
  assignedQuizzes.forEach(quiz => {
    const list = attemptsByQuiz[quiz.id] ?? [];
    attemptCountByQuizId[quiz.id] = list.length;
    const best = bestAttemptByQuiz[quiz.id];
    if (best) {
      bestPercentageByQuizId[quiz.id] =
        best.percentage ?? (best.maxScore ? Math.round(((best.score ?? 0) / best.maxScore) * 100) : 0);
    }
    const submitted = list.filter(a => a.submittedAt != null);
    if (submitted.length > 0) {
      const latest = submitted[submitted.length - 1];
      latestAttemptIdByQuizId[quiz.id] = latest.id;
    }
  });

  return (
    <div className="min-h-screen w-screen bg-[#030303] flex">
      <StudentSidebar user={user} />
      <main className="flex-1 flex flex-col py-10 px-4 md:px-8 overflow-x-hidden">
        <section className="w-full max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Quizzes</h1>
          <p className="text-white/60 text-lg">Take quizzes for your enrolled sections</p>
        </section>
        <section className="w-full max-w-7xl mx-auto">
          <StudentQuizzesTableClient
            quizzes={quizzes}
            attemptCountByQuizId={attemptCountByQuizId}
            bestPercentageByQuizId={bestPercentageByQuizId}
            latestAttemptIdByQuizId={latestAttemptIdByQuizId}
          />
        </section>
      </main>
    </div>
  );
}
