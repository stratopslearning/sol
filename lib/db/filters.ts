/**
 * Helpers for soft-delete-aware queries.
 *
 * Soft-deleted rows are kept in the table (so admins can audit / restore /
 * purge) but should not appear in regular reads. Use these helpers in every
 * SELECT that reads `quizzes`, `sections`, or `courses`.
 *
 *   import { activeOnly } from '@/lib/db/filters';
 *   const rows = await db.query.quizzes.findMany({
 *     where: activeOnly(quizzes.deletedAt),
 *   });
 *
 * Or compose with other filters:
 *
 *   where: and(eq(quizzes.professorId, user.id), activeOnly(quizzes.deletedAt))
 */
import { isNull } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';

export function activeOnly(deletedAtColumn: AnyColumn) {
  return isNull(deletedAtColumn);
}
