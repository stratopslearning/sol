import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courseMaterials,
  courseOutlines,
  courses,
  quizSections,
  quizzes,
  sections,
  workspaces,
} from '@/app/db/schema';
import { activeOnly } from '@/lib/db/filters';
import type { OnboardingChecklistState } from '@/lib/onboarding/workspaceSettings';
import { onboardingChecklistFromSettings } from '@/lib/onboarding/workspaceSettings';

export type TeacherHomeChecklistStep = {
  id: keyof OnboardingChecklistState;
  label: string;
  href: string;
  done: boolean;
};

export async function getTeacherHomeChecklistSteps(
  workspaceId: string,
): Promise<TeacherHomeChecklistStep[]> {
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { settings: true },
  });

  const provisionFlags = onboardingChecklistFromSettings(
    (ws?.settings as Record<string, unknown> | null) ?? null,
  );

  const courseRows = await db.query.courses.findMany({
    where: and(
      eq(courses.workspaceId, workspaceId),
      activeOnly(courses.deletedAt),
    ),
    columns: { id: true },
  });
  const courseIds = courseRows.map((c) => c.id);

  let hasMaterials = false;
  let hasOutline = false;
  let hasPublishedQuiz = false;
  let hasJoinLink = false;

  if (courseIds.length > 0) {
    const [materialRows, outlineRows, sectionRows] = await Promise.all([
      db.query.courseMaterials.findMany({
        where: inArray(courseMaterials.courseId, courseIds),
        columns: { id: true },
        limit: 1,
      }),
      db.query.courseOutlines.findMany({
        where: inArray(courseOutlines.courseId, courseIds),
        columns: { id: true },
        limit: 1,
      }),
      db.query.sections.findMany({
        where: and(
          inArray(sections.courseId, courseIds),
          activeOnly(sections.deletedAt),
        ),
        columns: {
          id: true,
          studentEnrollmentCode: true,
        },
      }),
    ]);

    hasMaterials = materialRows.length > 0;
    hasOutline = outlineRows.length > 0;
    hasJoinLink = sectionRows.some(
      (s) => Boolean(s.studentEnrollmentCode?.trim()),
    );

    const sectionIds = sectionRows.map((s) => s.id);
    if (sectionIds.length > 0) {
      const links = await db.query.quizSections.findMany({
        where: inArray(quizSections.sectionId, sectionIds),
        columns: { quizId: true },
      });
      const quizIds = [...new Set(links.map((l) => l.quizId))];
      if (quizIds.length > 0) {
        const activeQuizzes = await db.query.quizzes.findMany({
          where: and(
            inArray(quizzes.id, quizIds),
            eq(quizzes.isActive, true),
            activeOnly(quizzes.deletedAt),
          ),
          columns: { id: true },
          limit: 1,
        });
        hasPublishedQuiz = activeQuizzes.length > 0;
      }
    }
  }

  const done: OnboardingChecklistState = {
    materials: hasMaterials || provisionFlags.materials,
    outline: hasOutline || provisionFlags.outline,
    publish: hasPublishedQuiz || provisionFlags.publish,
    share: hasJoinLink || provisionFlags.share,
  };

  return [
    {
      id: 'materials',
      label: 'Upload course materials',
      href: '/dashboard/professor/materials',
      done: done.materials,
    },
    {
      id: 'outline',
      label: 'Generate or edit your outline',
      href: '/dashboard/professor/authoring',
      done: done.outline,
    },
    {
      id: 'publish',
      label: 'Publish a quiz or lesson',
      href: '/dashboard/professor/quiz/new',
      done: done.publish,
    },
    {
      id: 'share',
      label: 'Share the learner join code',
      href: '/dashboard/professor/courses',
      done: done.share,
    },
  ];
}
