/**
 * Hard assessment lock: during an active quiz attempt, quiz stems/keys must
 * not enter the tutor context at all (code gate, not prompt-only).
 */
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { attempts, quizSections } from '@/app/db/schema';

/** True when the student has an open (unsubmitted) attempt on this quiz. */
export async function studentHasActiveAttemptForQuiz(
  studentId: string,
  quizId: string,
): Promise<boolean> {
  const open = await db.query.attempts.findFirst({
    where: and(
      eq(attempts.studentId, studentId),
      eq(attempts.quizId, quizId),
      isNull(attempts.submittedAt),
    ),
    columns: { id: true },
  });
  return Boolean(open);
}

/**
 * True when the student has any open attempt on a quiz assigned to this section
 * that is linked to the chatbot's related quiz.
 */
export async function shouldLockQuizContext(opts: {
  studentId: string;
  relatedQuizId: string | null | undefined;
  sectionId?: string | null;
}): Promise<boolean> {
  if (!opts.relatedQuizId) return false;
  if (await studentHasActiveAttemptForQuiz(opts.studentId, opts.relatedQuizId)) {
    return true;
  }
  // Also lock if they have an open attempt on the same quiz via section assignment
  if (opts.sectionId) {
    const linked = await db.query.quizSections.findFirst({
      where: and(
        eq(quizSections.sectionId, opts.sectionId),
        eq(quizSections.quizId, opts.relatedQuizId),
      ),
      columns: { quizId: true },
    });
    if (linked) {
      return studentHasActiveAttemptForQuiz(opts.studentId, linked.quizId);
    }
  }
  return false;
}

export const NOT_IN_MATERIALS_REPLY =
  'That doesn’t appear in your course materials. I can only help with what’s in this course — want me to flag your instructor?';

/** Extract simple struggle topic tags from a student message (heuristic). */
export function extractStruggleTopics(message: string): string[] {
  const text = message.toLowerCase();
  const tags: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\b(confus(ed|ing)|don't understand|do not understand|stuck)\b/, 'confusion'],
    [/\b(formula|equation|calculate|computation)\b/, 'calculation'],
    [/\b(definition|mean(s|ing)|what is)\b/, 'definitions'],
    [/\b(example|apply|application)\b/, 'application'],
    [/\b(difference between|compare|versus|vs\.?)\b/, 'comparison'],
  ];
  for (const [re, tag] of patterns) {
    if (re.test(text)) tags.push(tag);
  }
  return tags.slice(0, 5);
}
