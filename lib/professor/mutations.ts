/**
 * Professor mutations for the MCP tool surface. Each function mirrors the
 * corresponding `/api/professor/*` route's authorization and behavior so an
 * agent acting through MCP can never do more than the same professor in the
 * dashboard. All throw `ApiError` on refusal.
 */
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  chatbotSections,
  chatbots,
  professorSections,
  questions,
  quizSections,
  quizzes,
  sections,
  studentSections,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import {
  getActiveChatbot,
  professorCanLinkQuiz,
  professorEnrolledInSections,
} from '@/lib/chatbot/access';
import { CHATBOT_MODEL } from '@/lib/chatbot/constants';
import { activeOnly } from '@/lib/db/filters';
import type { UserData } from '@/lib/getOrCreateUser';
import { getAttentionItemsForProfessor } from '@/lib/professorAttention';
import { upsertQuizQuestions } from '@/lib/quizQuestionUpsert';
import { regradeAttempt } from '@/lib/regradeAttempt';
import { parseOptionalEndsAt } from '@/lib/sectionAvailability';
import { assertTeachesSection } from '@/lib/professor/sections';

type ProfessorUser = Pick<UserData, 'id' | 'role' | 'clerkId'>;

export type QuizQuestionInput = {
  id?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  order: number;
};

async function enrolledSectionIds(userId: string): Promise<string[]> {
  const rows = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, userId),
  });
  return rows.map((r) => r.sectionId);
}

/** Mirrors POST /api/professor/enroll (PROFESSOR only). */
export async function enrollInSection(
  user: ProfessorUser,
  enrollmentCode: string,
): Promise<{ id: string; name: string; courseId: string }> {
  if (user.role !== 'PROFESSOR') {
    throw ApiError.forbidden('Only professors can enroll in sections');
  }

  const section = await db.query.sections.findFirst({
    where: and(
      eq(sections.professorEnrollmentCode, enrollmentCode),
      activeOnly(sections.deletedAt),
    ),
  });
  if (!section) throw ApiError.notFound('Invalid enrollment code');

  const existing = await db.query.professorSections.findFirst({
    where: and(
      eq(professorSections.sectionId, section.id),
      eq(professorSections.professorId, user.id),
    ),
  });
  if (existing) throw ApiError.badRequest('Already enrolled in this section');

  await db.insert(professorSections).values({
    professorId: user.id,
    sectionId: section.id,
  });

  return { id: section.id, name: section.name, courseId: section.courseId };
}

/** Mirrors POST /api/professor/section/[sectionId]/leave. */
export async function leaveSection(
  user: ProfessorUser,
  sectionId: string,
): Promise<void> {
  const enrollment = await db.query.professorSections.findFirst({
    where: and(
      eq(professorSections.sectionId, sectionId),
      eq(professorSections.professorId, user.id),
    ),
  });
  if (!enrollment) throw ApiError.badRequest('Not enrolled in this section');

  await db
    .delete(professorSections)
    .where(
      and(
        eq(professorSections.sectionId, sectionId),
        eq(professorSections.professorId, user.id),
      ),
    );

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'education.professor_enrollment.leave',
    targetType: 'section',
    targetId: sectionId,
  });
}

/** Mirrors PATCH /api/professor/section/[sectionId] (endsAt only). */
export async function setSectionEndsAt(
  user: ProfessorUser,
  sectionId: string,
  endsAtIso: string | null,
): Promise<{ id: string; endsAt: Date | null }> {
  await assertTeachesSection(user, sectionId);

  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
  });
  if (!section) throw ApiError.notFound('Section not found');

  const parsed = parseOptionalEndsAt(endsAtIso);
  if (!parsed.ok) throw ApiError.badRequest(parsed.error);

  const [updated] = await db
    .update(sections)
    .set({ endsAt: parsed.endsAt, updatedAt: new Date() })
    .where(eq(sections.id, sectionId))
    .returning();

  return { id: updated.id, endsAt: updated.endsAt ?? null };
}

/** Mirrors POST /api/professor/section/.../quiz/.../unassign. */
export async function unassignQuizFromSection(
  user: ProfessorUser,
  sectionId: string,
  quizId: string,
): Promise<void> {
  await assertTeachesSection(user, sectionId);
  await db
    .delete(quizSections)
    .where(
      and(eq(quizSections.sectionId, sectionId), eq(quizSections.quizId, quizId)),
    );
}

/** Mirrors POST /api/professor/section/.../chatbot/.../unassign. */
export async function unassignDiscussionFromSection(
  user: ProfessorUser,
  sectionId: string,
  chatbotId: string,
): Promise<void> {
  await assertTeachesSection(user, sectionId);
  await db
    .delete(chatbotSections)
    .where(
      and(
        eq(chatbotSections.sectionId, sectionId),
        eq(chatbotSections.chatbotId, chatbotId),
      ),
    );
}

/** Mirrors POST /api/professor/quiz/create (PROFESSOR only). */
export async function createQuiz(
  user: ProfessorUser,
  input: {
    title: string;
    description?: string;
    sectionIds: string[];
    maxAttempts: number;
    timeLimit?: number;
    passingScore: number;
    startDate?: string;
    endDate?: string;
    questions: QuizQuestionInput[];
  },
): Promise<{ id: string; title: string; sectionIds: string[] }> {
  if (user.role !== 'PROFESSOR') {
    throw ApiError.forbidden('Only professors can create quizzes');
  }
  if (input.sectionIds.length === 0) {
    throw ApiError.badRequest('Select at least one section');
  }

  const enrolled = await enrolledSectionIds(user.id);
  const invalid = input.sectionIds.filter((id) => !enrolled.includes(id));
  if (invalid.length > 0) {
    throw ApiError.forbidden(
      'You can only assign quizzes to sections you are enrolled in',
    );
  }

  const created = await db.transaction(async (tx) => {
    const [quiz] = await tx
      .insert(quizzes)
      .values({
        title: input.title,
        description: input.description,
        professorId: user.id,
        maxAttempts: input.maxAttempts,
        timeLimit: input.timeLimit,
        passingScore: input.passingScore,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: true,
      })
      .returning();

    if (input.questions.length > 0) {
      await tx.insert(questions).values(
        input.questions.map((q) => ({
          quizId: quiz.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: q.order,
        })),
      );
    }

    await tx.insert(quizSections).values(
      input.sectionIds.map((sectionId) => ({
        quizId: quiz.id,
        sectionId,
        assignedBy: user.id,
      })),
    );

    return quiz;
  });

  return { id: created.id, title: created.title, sectionIds: input.sectionIds };
}

/** Mirrors PUT /api/professor/quiz/[quizId]/update (owner or admin). */
export async function updateQuiz(
  user: ProfessorUser,
  quizId: string,
  input: {
    title: string;
    description?: string;
    sectionIds: string[];
    maxAttempts: number;
    timeLimit?: number;
    passingScore: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    questions: QuizQuestionInput[];
  },
): Promise<{ id: string; title: string; sectionIds: string[] }> {
  const existing = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
  });
  if (!existing) throw ApiError.notFound('Quiz not found');

  const isAdmin = user.role === 'ADMIN';
  if (!isAdmin && existing.professorId !== user.id) {
    throw ApiError.forbidden('Only the quiz owner can edit it');
  }

  if (!isAdmin) {
    const enrolled = await enrolledSectionIds(user.id);
    const invalid = input.sectionIds.filter((id) => !enrolled.includes(id));
    if (invalid.length > 0) {
      throw ApiError.forbidden(
        'You can only assign quizzes to sections you are enrolled in',
      );
    }
  }

  if (input.startDate && input.endDate) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw ApiError.badRequest('Invalid date format');
    }
    if (end <= start) {
      throw ApiError.badRequest(
        'End date and time must be after start date and time',
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(quizzes)
      .set({
        title: input.title,
        description: input.description,
        maxAttempts: input.maxAttempts,
        timeLimit: input.timeLimit,
        passingScore: input.passingScore,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId));

    await upsertQuizQuestions(tx, quizId, input.questions);

    await tx.delete(quizSections).where(eq(quizSections.quizId, quizId));
    await tx.insert(quizSections).values(
      input.sectionIds.map((sectionId) => ({
        quizId,
        sectionId,
        assignedBy: user.id,
      })),
    );
  });

  return { id: quizId, title: input.title, sectionIds: input.sectionIds };
}

/** Mirrors POST /api/professor/quiz/[quizId]/duplicate. */
export async function duplicateQuiz(
  user: ProfessorUser,
  quizId: string,
): Promise<{ id: string; title: string }> {
  const original = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    with: { questions: true, sectionAssignments: true },
  });
  if (!original) throw ApiError.notFound('Quiz not found');

  const isAdmin = user.role === 'ADMIN';
  const isOwner = original.professorId === user.id;
  let sectionsToCopy = original.sectionAssignments;

  if (!isAdmin && !isOwner) {
    const enrolled = new Set(await enrolledSectionIds(user.id));
    const isCoTeacher = original.sectionAssignments.some((sa) =>
      enrolled.has(sa.sectionId),
    );
    if (!isCoTeacher) {
      throw ApiError.forbidden('You do not have access to this quiz');
    }
    sectionsToCopy = original.sectionAssignments.filter((sa) =>
      enrolled.has(sa.sectionId),
    );
  }

  const created = await db.transaction(async (tx) => {
    const [quiz] = await tx
      .insert(quizzes)
      .values({
        title: `${original.title} (Copy)`,
        description: original.description,
        professorId: user.id,
        maxAttempts: original.maxAttempts,
        timeLimit: original.timeLimit,
        passingScore: original.passingScore,
        startDate: original.startDate,
        endDate: original.endDate,
        isActive: false,
      })
      .returning();

    if (original.questions.length > 0) {
      await tx.insert(questions).values(
        original.questions.map((q) => ({
          quizId: quiz.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: q.order,
        })),
      );
    }

    if (sectionsToCopy.length > 0) {
      await tx.insert(quizSections).values(
        sectionsToCopy.map((sa) => ({
          quizId: quiz.id,
          sectionId: sa.sectionId,
          assignedBy: user.id,
        })),
      );
    }

    return quiz;
  });

  return { id: created.id, title: created.title };
}

/** Mirrors POST /api/professor/quiz/[quizId]/archive (owner or admin). */
export async function archiveQuiz(
  user: ProfessorUser,
  quizId: string,
): Promise<{ id: string }> {
  const existing = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
  });
  if (!existing) throw ApiError.notFound('Quiz not found');

  if (user.role !== 'ADMIN' && existing.professorId !== user.id) {
    throw ApiError.forbidden('Only the quiz owner can archive it');
  }

  const [archived] = await db
    .update(quizzes)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(quizzes.id, quizId))
    .returning();

  return { id: archived.id };
}

/**
 * Assign an existing quiz to additional sections the caller teaches (owner or
 * admin). Additive — unlike update, existing assignments are kept.
 */
export async function assignQuizSections(
  user: ProfessorUser,
  quizId: string,
  sectionIds: string[],
): Promise<{ id: string; sectionIds: string[] }> {
  if (sectionIds.length === 0) {
    throw ApiError.badRequest('Provide at least one section id');
  }

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
  });
  if (!quiz) throw ApiError.notFound('Quiz not found');
  if (user.role !== 'ADMIN' && quiz.professorId !== user.id) {
    throw ApiError.forbidden('Only the quiz owner can assign it to sections');
  }

  if (user.role !== 'ADMIN') {
    const enrolled = new Set(await enrolledSectionIds(user.id));
    const invalid = sectionIds.filter((id) => !enrolled.has(id));
    if (invalid.length > 0) {
      throw ApiError.forbidden(
        'You can only assign quizzes to sections you teach',
      );
    }
  }

  await db
    .insert(quizSections)
    .values(
      sectionIds.map((sectionId) => ({
        quizId,
        sectionId,
        assignedBy: user.id,
      })),
    )
    .onConflictDoNothing({
      target: [quizSections.quizId, quizSections.sectionId],
    });

  const links = await db.query.quizSections.findMany({
    where: eq(quizSections.quizId, quizId),
  });
  return { id: quizId, sectionIds: links.map((l) => l.sectionId) };
}

/** Mirrors POST /api/professor/attempt/[attemptId]/regrade. */
export async function regradeAttemptForProfessor(
  user: ProfessorUser,
  attemptId: string,
  options: { fallbackOnly?: boolean } = {},
): Promise<{ regradedQuestionCount: number; pendingQuestionCount: number }> {
  const attempt = await db.query.attempts.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.id, attemptId),
  });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (!attempt.submittedAt) {
    throw ApiError.badRequest('Only submitted attempts can be re-graded');
  }

  await assertTeachesSection(user, attempt.sectionId);

  const result = await regradeAttempt(attemptId, {
    fallbackOnly: options.fallbackOnly ?? true,
  });
  return {
    regradedQuestionCount: result.regradedQuestionCount,
    pendingQuestionCount: result.pendingQuestionCount,
  };
}

/**
 * Synchronous variant of the attention regrade used by MCP: processes a
 * bounded batch inline so the agent can report the outcome. Capped low
 * because each item may hit OpenAI.
 */
export async function regradeAttentionBatch(
  user: ProfessorUser,
  options: { limit?: number } = {},
): Promise<{
  processed: number;
  regradedQuestionCount: number;
  pendingQuestionCount: number;
  errors: number;
}> {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 20));
  const queue = await getAttentionItemsForProfessor(user.id, { limit });

  let regraded = 0;
  let pending = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      const result = await regradeAttempt(item.attemptId, {
        fallbackOnly: true,
      });
      regraded += result.regradedQuestionCount;
      pending += result.pendingQuestionCount;
    } catch (error) {
      errors += 1;
      console.error('[mcp regrade_attention] attempt failed', {
        attemptId: item.attemptId,
        error,
      });
    }
  }

  return {
    processed: queue.length,
    regradedQuestionCount: regraded,
    pendingQuestionCount: pending,
    errors,
  };
}

/** Mirrors POST /api/professor/chatbot/create. */
export async function createDiscussion(
  user: ProfessorUser,
  input: {
    title: string;
    description?: string;
    personaName?: string;
    instructions: string;
    systemPrompt: string;
    relatedQuizId?: string | null;
    sectionIds?: string[];
  },
): Promise<{ id: string; title: string }> {
  const sectionIds = input.sectionIds ?? [];

  if (user.role === 'PROFESSOR') {
    const ok = await professorEnrolledInSections(user.id, sectionIds);
    if (!ok) {
      throw ApiError.forbidden(
        'You can only assign discussions to sections you teach',
      );
    }
    if (input.relatedQuizId) {
      const canLink = await professorCanLinkQuiz(user.id, input.relatedQuizId);
      if (!canLink) throw ApiError.forbidden('You cannot link that quiz');
    }
  }

  const created = await db.transaction(async (tx) => {
    const [bot] = await tx
      .insert(chatbots)
      .values({
        professorId: user.id,
        title: input.title,
        description: input.description ?? null,
        personaName: input.personaName ?? 'Professor Emma',
        instructions: input.instructions,
        systemPrompt: input.systemPrompt,
        relatedQuizId: input.relatedQuizId ?? null,
        isTemplate: false,
        model: CHATBOT_MODEL,
        isActive: true,
      })
      .returning();

    if (sectionIds.length > 0) {
      await tx.insert(chatbotSections).values(
        sectionIds.map((sectionId) => ({
          chatbotId: bot.id,
          sectionId,
          assignedBy: user.id,
        })),
      );
    }

    return bot;
  });

  return { id: created.id, title: created.title };
}

/** Mirrors PUT /api/professor/chatbot/[id]/update (owner or admin). */
export async function updateDiscussion(
  user: ProfessorUser,
  chatbotId: string,
  input: {
    title?: string;
    description?: string | null;
    personaName?: string;
    instructions?: string;
    systemPrompt?: string;
    relatedQuizId?: string | null;
    sectionIds?: string[];
    isActive?: boolean;
  },
): Promise<{ id: string }> {
  const bot = await getActiveChatbot(chatbotId);
  if (!bot || bot.isTemplate) throw ApiError.notFound('Discussion not found');
  if (user.role === 'PROFESSOR' && bot.professorId !== user.id) {
    throw ApiError.forbidden('You do not own this discussion');
  }

  if (input.sectionIds && user.role === 'PROFESSOR') {
    const ok = await professorEnrolledInSections(user.id, input.sectionIds);
    if (!ok) {
      throw ApiError.forbidden(
        'You can only assign discussions to sections you teach',
      );
    }
  }
  if (input.relatedQuizId && user.role === 'PROFESSOR') {
    const canLink = await professorCanLinkQuiz(user.id, input.relatedQuizId);
    if (!canLink) throw ApiError.forbidden('You cannot link that quiz');
  }

  await db.transaction(async (tx) => {
    await tx
      .update(chatbots)
      .set({
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.personaName != null
          ? { personaName: input.personaName }
          : {}),
        ...(input.instructions != null
          ? { instructions: input.instructions }
          : {}),
        ...(input.systemPrompt != null
          ? { systemPrompt: input.systemPrompt }
          : {}),
        ...(input.relatedQuizId !== undefined
          ? { relatedQuizId: input.relatedQuizId }
          : {}),
        ...(input.isActive != null ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(chatbots.id, chatbotId));

    if (input.sectionIds) {
      await tx
        .delete(chatbotSections)
        .where(eq(chatbotSections.chatbotId, chatbotId));
      if (input.sectionIds.length > 0) {
        await tx.insert(chatbotSections).values(
          input.sectionIds.map((sectionId) => ({
            chatbotId,
            sectionId,
            assignedBy: user.id,
          })),
        );
      }
    }
  });

  return { id: chatbotId };
}

/** Mirrors POST /api/professor/chatbot/[id]/assign (additive). */
export async function assignDiscussion(
  user: ProfessorUser,
  chatbotId: string,
  sectionIds: string[],
): Promise<{ id: string }> {
  if (sectionIds.length === 0) {
    throw ApiError.badRequest('Provide at least one section id');
  }

  const bot = await getActiveChatbot(chatbotId);
  if (!bot || bot.isTemplate) {
    throw ApiError.badRequest('Duplicate the template before assigning');
  }
  if (user.role === 'PROFESSOR' && bot.professorId !== user.id) {
    throw ApiError.forbidden('You do not own this discussion');
  }
  if (user.role === 'PROFESSOR') {
    const ok = await professorEnrolledInSections(user.id, sectionIds);
    if (!ok) {
      throw ApiError.forbidden('You can only assign to sections you teach');
    }
  }

  await db
    .insert(chatbotSections)
    .values(
      sectionIds.map((sectionId) => ({
        chatbotId,
        sectionId,
        assignedBy: user.id,
      })),
    )
    .onConflictDoNothing({
      target: [chatbotSections.chatbotId, chatbotSections.sectionId],
    });

  return { id: chatbotId };
}

/** Mirrors POST /api/professor/chatbot/[id]/duplicate (template or owned). */
export async function duplicateDiscussion(
  user: ProfessorUser,
  chatbotId: string,
): Promise<{ id: string; title: string }> {
  const source = await getActiveChatbot(chatbotId);
  if (!source) throw ApiError.notFound('Discussion not found');
  if (
    user.role === 'PROFESSOR' &&
    !source.isTemplate &&
    source.professorId !== user.id
  ) {
    throw ApiError.forbidden('You do not have access to this discussion');
  }

  const [created] = await db
    .insert(chatbots)
    .values({
      professorId: user.id,
      title: source.isTemplate ? source.title : `${source.title} (copy)`,
      description: source.description,
      personaName: source.personaName,
      instructions: source.instructions,
      systemPrompt: source.systemPrompt,
      relatedQuizId: source.relatedQuizId,
      isTemplate: false,
      model: source.model || CHATBOT_MODEL,
      isActive: true,
    })
    .returning();

  return { id: created.id, title: created.title };
}

/** Mirrors POST /api/professor/quiz/[quizId]/section-copy. */
export async function sectionCopyQuiz(
  user: ProfessorUser,
  quizId: string,
): Promise<{ id: string; title: string; sectionIds: string[] }> {
  const original = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
    with: { questions: true, sectionAssignments: true },
  });
  if (!original) throw ApiError.notFound('Quiz not found');
  if (original.professorId === user.id) {
    throw ApiError.conflict('Quiz is already editable');
  }

  let sectionsToMove = original.sectionAssignments;
  if (user.role !== 'ADMIN') {
    const enrolled = new Set(await enrolledSectionIds(user.id));
    sectionsToMove = original.sectionAssignments.filter((sa) =>
      enrolled.has(sa.sectionId),
    );
  }
  if (sectionsToMove.length === 0) {
    throw ApiError.forbidden(
      'No editable section assignments found for this quiz',
    );
  }
  const sectionIdsToMove = sectionsToMove.map((sa) => sa.sectionId);

  const copied = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(quizzes)
      .values({
        title: original.title,
        description: original.description,
        professorId: user.id,
        maxAttempts: original.maxAttempts,
        timeLimit: original.timeLimit,
        passingScore: original.passingScore,
        startDate: original.startDate,
        endDate: original.endDate,
        isActive: original.isActive,
      })
      .returning();

    if (original.questions.length > 0) {
      await tx.insert(questions).values(
        original.questions.map((q) => ({
          quizId: created.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: q.order,
        })),
      );
    }

    await tx.insert(quizSections).values(
      sectionsToMove.map((sa) => ({
        quizId: created.id,
        sectionId: sa.sectionId,
        assignedBy: user.id,
      })),
    );

    await tx
      .update(attempts)
      .set({ quizId: created.id })
      .where(
        and(
          eq(attempts.quizId, original.id),
          inArray(attempts.sectionId, sectionIdsToMove),
        ),
      );

    const enrolledStudents = await tx.query.studentSections.findMany({
      where: and(
        inArray(studentSections.sectionId, sectionIdsToMove),
        eq(studentSections.status, 'ACTIVE'),
      ),
      columns: { studentId: true },
    });
    const enrolledStudentIds = [
      ...new Set(enrolledStudents.map((e) => e.studentId)),
    ];

    if (enrolledStudentIds.length > 0) {
      await tx
        .update(assignments)
        .set({ quizId: created.id })
        .where(
          and(
            eq(assignments.quizId, original.id),
            inArray(assignments.studentId, enrolledStudentIds),
          ),
        );
    }

    await tx
      .delete(quizSections)
      .where(
        and(
          eq(quizSections.quizId, original.id),
          inArray(quizSections.sectionId, sectionIdsToMove),
        ),
      );

    return created;
  });

  return { id: copied.id, title: copied.title, sectionIds: sectionIdsToMove };
}
