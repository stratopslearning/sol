/** Client-safe helper: grades are visible when release timestamp is in the past. */
export function quizGradesAreReleased(quiz: {
  gradesReleasedAt: Date | string | null | undefined;
}): boolean {
  if (!quiz.gradesReleasedAt) return false;
  return new Date(quiz.gradesReleasedAt).getTime() <= Date.now();
}
