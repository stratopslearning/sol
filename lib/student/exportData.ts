import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  attempts,
  chatbotSessions,
  studentSections,
} from '@/app/db/schema';
import { maybeDecryptAttemptAnswers } from '@/lib/crypto/fieldEncryption';

export async function exportStudentData(studentId: string) {
  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { section: true },
  });

  const attemptRows = await db.query.attempts.findMany({
    where: eq(attempts.studentId, studentId),
    orderBy: (t, { desc }) => [desc(t.submittedAt)],
    limit: 500,
  });

  const sessions = await db.query.chatbotSessions.findMany({
    where: eq(chatbotSessions.studentId, studentId),
    orderBy: (t, { desc }) => [desc(t.startedAt)],
    limit: 200,
  });

  return {
    exportedAt: new Date().toISOString(),
    enrollments: enrollments.map((e) => ({
      sectionId: e.sectionId,
      sectionName: e.section?.name ?? null,
      courseId: e.section?.courseId ?? null,
      enrolledAt: e.enrolledAt,
    })),
    attempts: attemptRows.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      sectionId: a.sectionId,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      passed: a.passed,
      gradingStatus: a.gradingStatus,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      answers: maybeDecryptAttemptAnswers(a.answers),
    })),
    chatbotSessions: sessions.map((s) => ({
      id: s.id,
      chatbotId: s.chatbotId,
      sectionId: s.sectionId,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      messageCount: (s.messages ?? []).length,
      sessionMetadata: s.sessionMetadata,
    })),
  };
}
