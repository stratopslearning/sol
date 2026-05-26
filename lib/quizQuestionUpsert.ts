import { eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import { questions } from '@/app/db/schema';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type QuestionUpsertInput = {
  id?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  points: number;
  order?: number;
};

export async function upsertQuizQuestions(
  tx: DbTransaction,
  quizId: string,
  incomingQuestions: QuestionUpsertInput[],
) {
  const existingQuestions = await tx.query.questions.findMany({
    where: eq(questions.quizId, quizId),
    columns: {
      id: true,
      question: true,
      correctAnswer: true,
      rubricVersion: true,
    },
  });
  const existingById = new Map(existingQuestions.map((q) => [q.id, q]));
  const retainedIds = new Set<string>();

  for (const [index, question] of incomingQuestions.entries()) {
    const order = question.order ?? index + 1;
    const basePayload = {
      type: question.type,
      question: question.question,
      options: question.options ?? null,
      correctAnswer: question.correctAnswer ?? null,
      points: question.points,
      order,
    };

    const hasPersistedId =
      typeof question.id === 'string' &&
      UUID_RE.test(question.id) &&
      existingById.has(question.id);

    if (hasPersistedId) {
      const existing = existingById.get(question.id!)!;
      const referenceChanged =
        existing.question !== question.question ||
        (existing.correctAnswer ?? null) !== (question.correctAnswer ?? null);

      // When the question prompt or reference answer changes, the cached
      // rubric is no longer authoritative. Clear it and bump the version so
      // any cached grades in `grading_cache` are auto-invalidated and the
      // next grade derives a fresh rubric.
      const payload = referenceChanged
        ? {
            ...basePayload,
            rubric: null,
            rubricVersion: (existing.rubricVersion ?? 1) + 1,
          }
        : basePayload;

      retainedIds.add(question.id!);
      await tx
        .update(questions)
        .set(payload)
        .where(eq(questions.id, question.id!));
      continue;
    }

    await tx.insert(questions).values({
      quizId,
      ...basePayload,
    });
  }

  const idsToDelete = [...existingById.keys()].filter((id) => !retainedIds.has(id));
  if (idsToDelete.length > 0) {
    await tx.delete(questions).where(inArray(questions.id, idsToDelete));
  }
}
