import { eq } from 'drizzle-orm';

import { outlineItems } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import { DEFAULT_QUIZ_WINDOW_DAYS } from '@/lib/authoring/constants';
import {
  assertCanManageItem,
  assertCanManageOutline,
  listTeachableSectionIdsForCourse,
} from '@/lib/authoring/access';
import type { OutlineItemSummary } from '@/lib/authoring/outlines';
import {
  createLessonFromAuthoring,
  setLessonVisibility,
} from '@/lib/learning';
import {
  createDiscussion,
  createQuiz,
  setQuizVisibility,
  updateDiscussion,
  type QuizQuestionInput,
} from '@/lib/professor/mutations';
import {
  createInteractiveFromAuthoring,
  setInteractiveVisibility,
} from '@/lib/interactives';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id' | 'platformStaff' | 'clerkId'>;

function quizWindowIso() {
  const start = new Date();
  const end = new Date(
    start.getTime() + DEFAULT_QUIZ_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function parseQuizDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function mapQuestions(
  questions: NonNullable<OutlineItemSummary['body']['questions']>,
): QuizQuestionInput[] {
  return questions.map((q, order) => ({
    type: q.type,
    question: q.question,
    options: q.options,
    correctAnswer: q.referenceAnswer ?? q.correctAnswer,
    points: q.points ?? 1,
    order,
    conceptTags: q.conceptTags ?? [],
    rubric: q.rubric,
    rubricStatus: q.rubric && q.rubric.length > 0 ? 'approved' : 'none',
  }));
}

function toSummary(
  row: typeof outlineItems.$inferSelect,
): OutlineItemSummary {
  return {
    id: row.id,
    moduleId: row.moduleId,
    type: row.type as OutlineItemSummary['type'],
    title: row.title,
    status: row.status as OutlineItemSummary['status'],
    body: (row.body ?? {}) as OutlineItemSummary['body'],
    sourceMaterialIds: (row.sourceMaterialIds ?? []) as string[],
    variantOfItemId: row.variantOfItemId ?? null,
    faithfulBody: (row.faithfulBody ??
      null) as OutlineItemSummary['faithfulBody'],
    publishedQuizId: row.publishedQuizId,
    publishedChatbotId: row.publishedChatbotId,
    publishedLessonId: row.publishedLessonId,
    publishedInteractiveId: row.publishedInteractiveId,
    position: row.position,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function publishOutlineItem(
  user: AuthUser,
  itemId: string,
  opts?: { sectionIds?: string[] },
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<OutlineItemSummary> {
  const { item, outline } = await assertCanManageItem(user, itemId);
  const body = (item.body ?? {}) as OutlineItemSummary['body'];

  if (
    item.publishedQuizId ||
    item.publishedChatbotId ||
    item.publishedLessonId ||
    item.publishedInteractiveId
  ) {
    throw ApiError.badRequest('Item is already published');
  }

  let sectionIds = opts?.sectionIds?.filter(Boolean) ?? [];
  if (sectionIds.length === 0) {
    sectionIds = await listTeachableSectionIdsForCourse(
      user,
      outline.courseId,
    );
  }
  if (sectionIds.length === 0) {
    throw ApiError.badRequest(
      'Assign yourself to a section of this course before publishing',
    );
  }

  let publishedQuizId: string | null = null;
  let publishedChatbotId: string | null = null;
  let publishedLessonId: string | null = null;
  let publishedInteractiveId: string | null = null;

  if (item.type === 'LESSON') {
    if (!body.markdown?.trim()) {
      throw ApiError.badRequest('Lesson has no markdown content');
    }
    const created = await createLessonFromAuthoring(user, {
      courseId: outline.courseId,
      title: item.title,
      markdown: body.markdown,
      sectionIds,
      flashcards: body.flashcards,
      sourceOutlineItemId: item.id,
      isActive: false,
    });
    publishedLessonId = created.id;
  } else if (item.type === 'QUIZ') {
    if (!body.questions?.length) {
      throw ApiError.badRequest('Quiz has no questions');
    }
    const defaults = quizWindowIso();
    const startDate = parseQuizDate(body.startDate) ?? defaults.startDate;
    const endDate = parseQuizDate(body.endDate) ?? defaults.endDate;
    if (new Date(endDate) <= new Date(startDate)) {
      throw ApiError.badRequest('Quiz end date must be after start date');
    }
    const created = await createQuiz(user, {
      title: item.title,
      description: body.description,
      sectionIds,
      maxAttempts: body.maxAttempts ?? 1,
      timeLimit: body.timeLimit ?? undefined,
      passingScore: body.passingScore ?? 70,
      startDate,
      endDate,
      questions: mapQuestions(body.questions),
      isActive: false,
      sourceOutlineItemId: item.id,
    });
    publishedQuizId = created.id;
    try {
      const { createQuizVersionSnapshot } = await import('@/lib/quiz/versions');
      await createQuizVersionSnapshot({
        quizId: created.id,
        createdByUserId: user.id,
      });
    } catch (err) {
      console.warn('[publishOutlineItem] quiz version snapshot failed', err);
    }
  } else if (item.type === 'DISCUSSION') {
    if (!body.systemPrompt?.trim() || !body.instructions?.trim()) {
      throw ApiError.badRequest('Discussion is incomplete');
    }
    const created = await createDiscussion(user, {
      title: item.title,
      description: body.description,
      personaName: body.personaName,
      instructions: body.instructions,
      systemPrompt: body.systemPrompt,
      sectionIds,
      isActive: false,
    });
    publishedChatbotId = created.id;
  } else if (item.type === 'INTERACTIVE') {
    const kind = body.interactiveKind;
    if (
      !kind ||
      !['FILL_BLANKS', 'DRAG_WORDS', 'IMAGE_HOTSPOTS', 'ACCORDION'].includes(
        kind,
      )
    ) {
      throw ApiError.badRequest('Interactive kind is missing or unsupported');
    }
    if (!body.interactiveBody || Object.keys(body.interactiveBody).length === 0) {
      throw ApiError.badRequest('Interactive body is empty');
    }
    const created = await createInteractiveFromAuthoring(user, {
      courseId: outline.courseId,
      title: item.title,
      description: body.description,
      kind,
      body: body.interactiveBody,
      sectionIds,
      sourceOutlineItemId: item.id,
    });
    publishedInteractiveId = created.id;
  }

  try {
    const { markOutlineItemPublishedDefiner } = await import(
      '@/lib/db/entityScopedReads'
    );
    await markOutlineItemPublishedDefiner({
      itemId,
      publishedQuizId,
      publishedChatbotId,
      publishedLessonId,
      publishedInteractiveId,
    });
  } catch (err) {
    console.warn('[publishOutlineItem] DEFINER mark published failed', err);
  }

  void logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.authoring.publish',
    targetType: 'outline_item',
    targetId: itemId,
    tenantId: outline.tenantId,
    metadata: {
      type: item.type,
      publishedQuizId,
      publishedChatbotId,
      publishedLessonId,
      publishedInteractiveId,
      sectionIds,
    },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  }).catch((err) => {
    console.warn('[publishOutlineItem] audit skipped', err);
  });

  return {
    id: item.id,
    moduleId: item.moduleId,
    type: item.type as OutlineItemSummary['type'],
    title: item.title,
    status: 'PUBLISHED',
    body,
    sourceMaterialIds: (item.sourceMaterialIds ?? []) as string[],
    variantOfItemId: item.variantOfItemId ?? null,
    faithfulBody: (item.faithfulBody ??
      null) as OutlineItemSummary['faithfulBody'],
    publishedQuizId,
    publishedChatbotId,
    publishedLessonId,
    publishedInteractiveId,
    position: item.position,
  };
}

export type PublishItemsResult = {
  published: OutlineItemSummary[];
  failed: Array<{ itemId: string; title: string | null; error: string }>;
};

/** Publish many outline items as inactive course drafts. Continues on per-item errors. */
export async function publishOutlineItems(
  user: AuthUser,
  outlineId: string,
  itemIds: string[],
  opts?: { sectionIds?: string[] },
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<PublishItemsResult> {
  await assertCanManageOutline(user, outlineId);
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw ApiError.badRequest('Select at least one assignment to publish');
  }
  if (uniqueIds.length > 40) {
    throw ApiError.badRequest('Publish at most 40 assignments at a time');
  }

  // Resolve membership via DEFINER tree so FORCE RLS can't 404 real items.
  const { fetchOutlineTreeById } = await import('@/lib/db/entityScopedReads');
  const tree = await fetchOutlineTreeById(outlineId);
  if (!tree) throw ApiError.notFound('Outline not found');
  const titleById = new Map<string, string>();
  const outlineItemIds = new Set<string>();
  for (const mod of tree.modules) {
    for (const item of mod.items) {
      outlineItemIds.add(item.id);
      titleById.set(item.id, item.title);
    }
  }

  // Resolve sections once for the whole batch (avoids N withCourseTenant hangs).
  let sectionIds = opts?.sectionIds?.filter(Boolean) ?? [];
  if (sectionIds.length === 0) {
    sectionIds = await withTimeout(
      listTeachableSectionIdsForCourse(user, tree.courseId),
      20_000,
      'listTeachableSectionIdsForCourse',
    );
  }

  const published: OutlineItemSummary[] = [];
  const failed: PublishItemsResult['failed'] = [];

  for (const itemId of uniqueIds) {
    const title = titleById.get(itemId) ?? null;
    if (!outlineItemIds.has(itemId)) {
      failed.push({
        itemId,
        title,
        error: 'Item is not in this outline',
      });
      continue;
    }
    try {
      published.push(
        await publishOutlineItem(
          user,
          itemId,
          { sectionIds },
          audit,
        ),
      );
    } catch (err) {
      failed.push({
        itemId,
        title,
        error:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Publish failed',
      });
    }
  }

  return { published, failed };
}

export async function releaseOutlineItem(
  user: AuthUser,
  itemId: string,
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<OutlineItemSummary> {
  const { item, outline } = await assertCanManageItem(user, itemId);

  if (
    !item.publishedQuizId &&
    !item.publishedChatbotId &&
    !item.publishedLessonId &&
    !item.publishedInteractiveId
  ) {
    throw ApiError.badRequest('Publish the item before releasing to students');
  }

  if (item.publishedQuizId) {
    await setQuizVisibility(user, item.publishedQuizId, true);
  }
  if (item.publishedChatbotId) {
    await updateDiscussion(user, item.publishedChatbotId, {
      isActive: true,
    });
  }
  if (item.publishedLessonId) {
    await setLessonVisibility(user, item.publishedLessonId, true);
  }
  if (item.publishedInteractiveId) {
    await setInteractiveVisibility(user, item.publishedInteractiveId, true);
  }

  // Canvas AGS: create line items for linked sections when activity goes live.
  const { onActivityReleased } = await import('@/lib/lti/lineItems');
  if (item.publishedQuizId) {
    void onActivityReleased({ quizId: item.publishedQuizId });
  }
  if (item.publishedChatbotId) {
    void onActivityReleased({ chatbotId: item.publishedChatbotId });
  }
  if (item.publishedLessonId) {
    void onActivityReleased({ lessonId: item.publishedLessonId });
  }
  if (item.publishedInteractiveId) {
    void onActivityReleased({ interactiveId: item.publishedInteractiveId });
  }

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.authoring.release',
    targetType: 'outline_item',
    targetId: itemId,
    tenantId: outline.tenantId,
    metadata: {
      publishedQuizId: item.publishedQuizId,
      publishedChatbotId: item.publishedChatbotId,
      publishedLessonId: item.publishedLessonId,
      publishedInteractiveId: item.publishedInteractiveId,
    },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  return toSummary(item);
}
