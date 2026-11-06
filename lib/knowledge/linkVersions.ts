import { and, eq, isNotNull, ne, or, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { courseKnowledgeLinks } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { withTenant } from '@/lib/db/tenantContext';
import type { UserData } from '@/lib/getOrCreateUser';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import { getCourseWorkspaceId } from '@/lib/workspace';

type AuthUser = Pick<UserData, 'id' | 'platformStaff' | 'clerkId'>;

/**
 * When a library document advances currentVersionId, mark attached courses
 * that are still on an older pin so faculty can opt in.
 */
export async function notifyLinkedCoursesOfNewVersion(
  documentId: string,
  newVersionId: string,
): Promise<void> {
  const now = new Date();
  await db
    .update(courseKnowledgeLinks)
    .set({
      updateAvailableVersionId: newVersionId,
      updateNoticedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(courseKnowledgeLinks.documentId, documentId),
        or(
          sql`${courseKnowledgeLinks.pinnedVersionId} IS NULL`,
          ne(courseKnowledgeLinks.pinnedVersionId, newVersionId),
        ),
      ),
    );
}

/** Advance the course pin to the offered update version. */
export async function acceptLinkedDocumentUpdate(
  user: AuthUser,
  courseId: string,
  documentId: string,
): Promise<void> {
  await assertCanManageCourse(user, courseId);
  const workspaceId = await getCourseWorkspaceId(courseId);
  if (!workspaceId) throw ApiError.badRequest('Course has no workspace');

  await withTenant(workspaceId, user.id, async (tx) => {
    const link = await tx.query.courseKnowledgeLinks.findFirst({
      where: and(
        eq(courseKnowledgeLinks.courseId, courseId),
        eq(courseKnowledgeLinks.documentId, documentId),
      ),
    });
    if (!link) throw ApiError.notFound('Document is not attached to this course');
    if (!link.updateAvailableVersionId) {
      throw ApiError.badRequest('No update available for this attachment');
    }
    const now = new Date();
    await tx
      .update(courseKnowledgeLinks)
      .set({
        pinnedVersionId: link.updateAvailableVersionId,
        updateAvailableVersionId: null,
        updateNoticedAt: null,
        updatedAt: now,
      })
      .where(eq(courseKnowledgeLinks.id, link.id));
  });
}

/** Keep the current pin; clear the update notice. */
export async function dismissLinkedDocumentUpdate(
  user: AuthUser,
  courseId: string,
  documentId: string,
): Promise<void> {
  await assertCanManageCourse(user, courseId);
  const workspaceId = await getCourseWorkspaceId(courseId);
  if (!workspaceId) throw ApiError.badRequest('Course has no workspace');

  const updated = await withTenant(workspaceId, user.id, async (tx) =>
    tx
      .update(courseKnowledgeLinks)
      .set({
        updateAvailableVersionId: null,
        updateNoticedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(courseKnowledgeLinks.courseId, courseId),
          eq(courseKnowledgeLinks.documentId, documentId),
          isNotNull(courseKnowledgeLinks.updateAvailableVersionId),
        ),
      )
      .returning(),
  );
  if (updated.length === 0) {
    throw ApiError.notFound('No pending update for this attachment');
  }
}
