import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { lessonSections, lessons } from '@/app/db/schema';
import {
  LESSON_EXCERPT_CHARS,
  SAFE_LESSONS_CONTEXT_CHAR_BUDGET,
} from '@/lib/learning/constants';

/**
 * Budgeted excerpts from active (released) lessons assigned to the student's
 * section. Matches listStudentLessons / assertStudentCanAccessLesson gates.
 */
export async function buildSafeLessonsContext(
  courseId: string,
  query: string,
  opts?: {
    sectionId?: string | null;
    budget?: number;
  },
): Promise<string> {
  if (!courseId) return '';
  const budget = opts?.budget ?? SAFE_LESSONS_CONTEXT_CHAR_BUDGET;
  const sectionId = opts?.sectionId ?? null;
  // Without a section we cannot prove assignment: refuse to leak course-wide lessons.
  if (!sectionId) return '';

  const q = query.trim().toLowerCase();
  const tokens = q
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 6);

  const assigned = await db.query.lessonSections.findMany({
    where: eq(lessonSections.sectionId, sectionId),
    columns: { lessonId: true },
  });
  const assignedIds = [...new Set(assigned.map((a) => a.lessonId))];
  if (assignedIds.length === 0) return '';

  const rows = await db.query.lessons.findMany({
    where: and(
      eq(lessons.courseId, courseId),
      eq(lessons.isActive, true),
      isNull(lessons.deletedAt),
      inArray(lessons.id, assignedIds),
    ),
    columns: {
      id: true,
      title: true,
      markdown: true,
      updatedAt: true,
    },
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
    limit: 20,
  });

  if (rows.length === 0) return '';

  const scored = rows.map((r) => {
    const hay = `${r.title}\n${r.markdown}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 1;
    }
    if (r.title.toLowerCase().includes(q.slice(0, 40))) score += 2;
    return { ...r, score };
  });

  scored.sort((a, b) => b.score - a.score || b.updatedAt.getTime() - a.updatedAt.getTime());

  return clipLessonExcerpts(
    scored.slice(0, 4).map((l) => ({ title: l.title, markdown: l.markdown })),
    budget,
  );
}

function clipLessonExcerpts(
  lessonsInput: Array<{ title: string; markdown: string }>,
  budget: number,
): string {
  const header =
    'Released lesson context (LEARNING MODE: teaching notes only, no quiz keys):';
  if (budget <= header.length + 20) return '';

  const lines: string[] = [header];
  let used = header.length;

  for (const lesson of lessonsInput) {
    const remaining = budget - used - 40;
    if (remaining < 40) break;
    const excerpt = lesson.markdown
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, Math.min(LESSON_EXCERPT_CHARS, remaining));
    if (!excerpt) continue;
    const block = `\n---\nLesson: ${lesson.title}\n${excerpt}`;
    if (used + block.length > budget) {
      const fit = block.slice(0, Math.max(0, budget - used));
      if (fit.length > 30) {
        lines.push(fit);
        used += fit.length;
      }
      break;
    }
    lines.push(block);
    used += block.length;
  }

  return lines.length <= 1 ? '' : lines.join('');
}

/** Exported for unit tests: budget clipping without DB. */
export function clipLessonsContextForTest(
  lessonsInput: Array<{ title: string; markdown: string }>,
  budget = SAFE_LESSONS_CONTEXT_CHAR_BUDGET,
): string {
  return clipLessonExcerpts(lessonsInput, budget);
}
