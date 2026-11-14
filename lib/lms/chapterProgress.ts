import { ApiError } from '@/lib/api/errors';
import {
  listChapterSectionProgressDefiner,
  upsertChapterSectionProgressDefiner,
  upsertLessonProgressDefiner,
} from '@/lib/db/studentReadDefiners';
import {
  completeModuleItemDefiner,
  listCourseModulesDefiner,
  listModuleItemsDefiner,
} from '@/lib/db/lmsDefiners';
import { assertStudentCanAccessLesson } from '@/lib/learning/access';
import {
  CHAPTER_QUESTIONS_PER_ATTEMPT,
  isInteractiveChapterBody,
} from '@/lib/lms/interactiveChapter';

/**
 * Grade a practice section check. Answers are keyed by question text → selected option.
 * Practice only — no gradebook write. Completes the lesson + module item when all
 * sections have a passing check.
 */
export async function submitChapterSectionCheck(opts: {
  studentId: string;
  lessonId: string;
  sectionId: string;
  /** question text → selected option */
  answers: Record<string, string>;
  moduleItemId?: string | null;
}) {
  const lesson = await assertStudentCanAccessLesson(
    opts.studentId,
    opts.lessonId,
  );
  if (!isInteractiveChapterBody(lesson.chapter)) {
    throw ApiError.badRequest('This lesson is not an interactive chapter');
  }

  const section = lesson.chapter.sections.find((s) => s.id === opts.sectionId);
  if (!section) throw ApiError.notFound('Section not found');

  const answerEntries = Object.entries(opts.answers).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 0,
  );
  if (answerEntries.length < Math.min(CHAPTER_QUESTIONS_PER_ATTEMPT, section.checkBank.length)) {
    throw ApiError.badRequest(
      `Answer ${CHAPTER_QUESTIONS_PER_ATTEMPT} questions to check your understanding`,
    );
  }

  const bankByQ = new Map(
    section.checkBank.map((q) => [q.question.trim().toLowerCase(), q]),
  );

  const results: Array<{
    question: string;
    correct: boolean;
    correctAnswer: string;
    explanation?: string;
  }> = [];

  for (const [question, selected] of answerEntries) {
    const match = bankByQ.get(question.trim().toLowerCase());
    if (!match) {
      throw ApiError.badRequest('One or more questions are not in this section');
    }
    const correct =
      selected.trim().toLowerCase() === match.correctAnswer.trim().toLowerCase();
    results.push({
      question: match.question,
      correct,
      correctAnswer: match.correctAnswer,
      explanation: match.explanation,
    });
  }

  const passed = results.length > 0 && results.every((r) => r.correct);

  const progress = await upsertChapterSectionProgressDefiner({
    lessonId: opts.lessonId,
    studentId: opts.studentId,
    sectionId: opts.sectionId,
    passed,
  });

  const allProgress = await listChapterSectionProgressDefiner(
    opts.lessonId,
    opts.studentId,
  );
  const passedIds = new Set(
    allProgress.filter((p) => p.passed).map((p) => p.sectionId),
  );
  if (passed) passedIds.add(opts.sectionId);

  const allSectionsDone = lesson.chapter.sections.every((s) =>
    passedIds.has(s.id),
  );

  if (allSectionsDone) {
    await upsertLessonProgressDefiner({
      lessonId: opts.lessonId,
      studentId: opts.studentId,
      status: 'COMPLETED',
    });

    let moduleItemId = opts.moduleItemId ?? null;
    if (!moduleItemId) {
      moduleItemId = await findModuleItemIdForLesson(
        lesson.courseId,
        opts.lessonId,
      );
    }
    if (moduleItemId) {
      try {
        await completeModuleItemDefiner({
          moduleItemId,
          studentId: opts.studentId,
        });
      } catch (err) {
        console.warn('[chapterProgress] module item complete skipped', err);
      }
    }
  } else {
    await upsertLessonProgressDefiner({
      lessonId: opts.lessonId,
      studentId: opts.studentId,
      status: 'STARTED',
    });
  }

  return {
    passed,
    results,
    progress,
    sectionsPassed: passedIds.size,
    sectionsTotal: lesson.chapter.sections.length,
    chapterComplete: allSectionsDone,
  };
}

async function findModuleItemIdForLesson(
  courseId: string,
  lessonId: string,
): Promise<string | null> {
  const modules = await listCourseModulesDefiner(courseId);
  for (const mod of modules) {
    const items = await listModuleItemsDefiner(mod.id);
    const hit = items.find((i) => i.lessonId === lessonId);
    if (hit) return hit.id;
  }
  return null;
}
