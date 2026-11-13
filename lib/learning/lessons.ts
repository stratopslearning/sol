import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { flashcards, lessonSections, lessons } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import {
  setActivityActiveByEntity,
  upsertActivityForLesson,
} from '@/lib/assignments/sync';
import { authorizeOnSection } from '@/lib/authz/courseAccess';
import { userCanAccessTeachingArea } from '@/lib/authz/gates';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id' | 'clerkId'> & {
  platformStaff?: boolean | null;
};

export type CreateLessonInput = {
  courseId: string;
  title: string;
  markdown: string;
  sectionIds: string[];
  flashcards?: Array<{ front: string; back: string }>;
  sourceOutlineItemId?: string | null;
  isActive?: boolean;
};

export async function createLessonFromAuthoring(
  user: AuthUser,
  input: CreateLessonInput,
): Promise<{ id: string; title: string }> {
  if (!(await userCanAccessTeachingArea(user.id)) && !user.platformStaff) {
    throw ApiError.forbidden('Teaching access required');
  }
  const markdown = input.markdown.trim();
  if (!markdown) throw ApiError.badRequest('Lesson markdown is required');
  if (input.sectionIds.length === 0) {
    throw ApiError.badRequest('Select at least one section');
  }

  const teachable = await listTeachableSectionIdsForCourse(
    user,
    input.courseId,
  );
  const allowed = new Set(teachable);
  const invalid = input.sectionIds.filter((id) => !allowed.has(id));
  if (invalid.length > 0) {
    throw ApiError.forbidden(
      'You can only assign lessons to sections you teach in this course',
    );
  }

  const created = await db.transaction(async (tx) => {
    const [lesson] = await tx
      .insert(lessons)
      .values({
        professorId: user.id,
        courseId: input.courseId,
        title: input.title.trim(),
        markdown,
        isActive: input.isActive ?? false,
        sourceOutlineItemId: input.sourceOutlineItemId ?? null,
      })
      .returning();

    const cards = (input.flashcards ?? []).filter(
      (c) => c.front?.trim() && c.back?.trim(),
    );
    if (cards.length > 0) {
      await tx.insert(flashcards).values(
        cards.map((c, i) => ({
          lessonId: lesson.id,
          front: c.front.trim(),
          back: c.back.trim(),
          position: i,
        })),
      );
    }

    return lesson;
  });

  const { assignLessonSectionsDefiner } = await import(
    '@/lib/db/facultyWriteDefiners'
  );
  await assignLessonSectionsDefiner({
    lessonId: created.id,
    assignedBy: user.id,
    sectionIds: input.sectionIds,
  });

  await upsertActivityForLesson(created.id, {
    courseId: created.courseId,
    professorId: created.professorId,
    title: created.title,
    isActive: created.isActive,
    sourceOutlineItemId: created.sourceOutlineItemId,
  });

  return { id: created.id, title: created.title };
}

/** Hook target: after visibility flip, Canvas line items may be created. */
export async function setLessonVisibility(
  user: AuthUser,
  lessonId: string,
  isActive: boolean,
): Promise<{ id: string; isActive: boolean }> {
  const existing = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });
  if (!existing || existing.deletedAt) {
    throw ApiError.notFound('Lesson not found');
  }

  const links = await db.query.lessonSections.findMany({
    where: eq(lessonSections.lessonId, lessonId),
    columns: { sectionId: true },
  });
  let canPublish = false;
  for (const link of links) {
    if (await authorizeOnSection(user, 'content.publish', link.sectionId)) {
      canPublish = true;
      break;
    }
    if (await authorizeOnSection(user, 'content.write', link.sectionId)) {
      canPublish = true;
      break;
    }
  }
  const authorId = existing.professorId;
  if (
    !canPublish &&
    authorId &&
    authorId === user.id &&
    (await userCanAccessTeachingArea(user.id))
  ) {
    canPublish = true;
  }
  if (!canPublish) {
    throw ApiError.forbidden('Only teaching staff can change lesson visibility');
  }

  const [updated] = await db
    .update(lessons)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId))
    .returning();

  await setActivityActiveByEntity({ lessonId }, isActive);

  return { id: updated.id, isActive: updated.isActive };
}
