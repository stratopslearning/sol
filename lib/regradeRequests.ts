import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  attempts,
  professorSections,
  regradeRequests,
  sections,
  users,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';

export async function createRegradeRequest(opts: {
  attemptId: string;
  studentId: string;
  note: string;
}) {
  const attempt = await db.query.attempts.findFirst({
    where: and(
      eq(attempts.id, opts.attemptId),
      eq(attempts.studentId, opts.studentId),
    ),
  });
  if (!attempt?.submittedAt) {
    throw ApiError.badRequest('Only submitted attempts can be regrade-requested');
  }
  const note = opts.note.trim();
  if (!note) throw ApiError.badRequest('Note is required');

  if (!attempt.tenantId) {
    throw ApiError.badRequest('Attempt is missing tenant_id');
  }

  const [row] = await db
    .insert(regradeRequests)
    .values({
      attemptId: opts.attemptId,
      tenantId: attempt.tenantId,
      studentId: opts.studentId,
      note,
      status: 'open',
    })
    .returning();
  return row!;
}

export async function listOpenRegradeRequestsForProfessor(professorId: string) {
  const { listTeachingSectionIds } = await import(
    '@/lib/professor/graderSections'
  );
  const sectionIds = await listTeachingSectionIds({ id: professorId });
  if (sectionIds.length === 0) return [];

  const rows = await db
    .select({
      id: regradeRequests.id,
      attemptId: regradeRequests.attemptId,
      note: regradeRequests.note,
      status: regradeRequests.status,
      createdAt: regradeRequests.createdAt,
      studentId: regradeRequests.studentId,
      studentFirstName: users.firstName,
      studentLastName: users.lastName,
      studentEmail: users.email,
      sectionId: attempts.sectionId,
      quizId: attempts.quizId,
    })
    .from(regradeRequests)
    .innerJoin(attempts, eq(attempts.id, regradeRequests.attemptId))
    .innerJoin(users, eq(users.id, regradeRequests.studentId))
    .where(
      and(
        eq(regradeRequests.status, 'open'),
        inArray(attempts.sectionId, sectionIds),
      ),
    )
    .orderBy(desc(regradeRequests.createdAt))
    .limit(100);

  return rows;
}

export async function getOpenRegradeRequestForAttempt(opts: {
  attemptId: string;
  studentId: string;
}) {
  return db.query.regradeRequests.findFirst({
    where: and(
      eq(regradeRequests.attemptId, opts.attemptId),
      eq(regradeRequests.studentId, opts.studentId),
      eq(regradeRequests.status, 'open'),
    ),
    columns: { id: true, note: true, createdAt: true },
  });
}

export async function resolveRegradeRequestForProfessor(opts: {
  requestId: string;
  professorId: string;
}) {
  const row = await db.query.regradeRequests.findFirst({
    where: eq(regradeRequests.id, opts.requestId),
  });
  if (!row) throw ApiError.notFound('Regrade request not found');
  if (row.status !== 'open') {
    throw ApiError.badRequest('Regrade request is already closed');
  }

  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, row.attemptId),
    columns: { sectionId: true },
  });
  if (!attempt) throw ApiError.notFound('Attempt not found');

  const teaches = await db.query.professorSections.findFirst({
    where: and(
      eq(professorSections.professorId, opts.professorId),
      eq(professorSections.sectionId, attempt.sectionId),
    ),
    columns: { sectionId: true },
  });
  if (!teaches) throw ApiError.forbidden('Not allowed to resolve this request');

  const [updated] = await db
    .update(regradeRequests)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(eq(regradeRequests.id, opts.requestId))
    .returning();
  return updated!;
}
