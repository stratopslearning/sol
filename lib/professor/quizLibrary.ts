/**
 * Professor quiz library helpers: hide/publish vs archive, and which rows
 * belong in the faculty table.
 *
 * Hide/publish flips `isActive` so students cannot start a draft. Archive
 * (soft-delete) is a separate action and must not be used as that toggle —
 * posting /archive a second time 404s because `deletedAt` is already set.
 */

export type LibraryQuiz = {
  id: string;
  deletedAt: Date | string | null;
};

/** Columns written by POST /api/professor/quiz/[quizId]/visibility. */
export function quizVisibilityFields(
  isActive: boolean,
  now: Date = new Date(),
): { isActive: boolean; updatedAt: Date; deletedAt?: null } {
  if (isActive) {
    return { isActive: true, deletedAt: null, updatedAt: now };
  }
  return { isActive: false, updatedAt: now };
}

/** Dedupes section-join rows and drops archived (soft-deleted) quizzes. */
export function uniqueVisibleLibraryQuizzes<T extends LibraryQuiz>(
  quizzes: Array<T | null | undefined>,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const quiz of quizzes) {
    if (!quiz || quiz.deletedAt != null) continue;
    if (seen.has(quiz.id)) continue;
    seen.add(quiz.id);
    out.push(quiz);
  }
  return out;
}

export function quizLibraryActionLabels(opts: {
  isActive: boolean;
  isOwner: boolean;
}): {
  results: string;
  edit: string;
  discussion: string;
  duplicate: string;
  visibility: string;
} {
  return {
    results: 'View results',
    edit: opts.isOwner ? 'Edit quiz' : 'Edit a copy for your section',
    discussion: 'Create a discussion from this quiz',
    duplicate: 'Duplicate quiz',
    visibility: opts.isActive
      ? 'Hide from students until you publish it again'
      : 'Publish so students can take this quiz',
  };
}

export function quizVisibilityApiPath(quizId: string): string {
  return `/api/professor/quiz/${quizId}/visibility`;
}
