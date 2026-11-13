import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courseKnowledgeLinks,
  courseMaterials,
  knowledgeDocuments,
  knowledgeDocumentVersions,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import type { UserData } from '@/lib/getOrCreateUser';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import {
  assertWorkspaceFacultyRead,
  isWorkspaceKnowledgeCoordinator,
} from '@/lib/knowledge/workspaceAccess';
import { getMaterialObjectBytes } from '@/lib/knowledge/storage';

type AuthUser = Pick<UserData, 'id' | 'clerkId'> & { platformStaff?: boolean | null };

export type KnowledgePreviewMeta = {
  id: string;
  title: string;
  sourceKind: string;
  mimeType: string | null;
  externalUrl: string | null;
  hasFile: boolean;
  status: string;
};

async function assertCanPreviewDocument(user: AuthUser, documentId: string) {
  const doc = await db.query.knowledgeDocuments.findFirst({
    where: and(
      eq(knowledgeDocuments.id, documentId),
      isNull(knowledgeDocuments.deletedAt),
    ),
  });
  if (!doc) throw ApiError.notFound('Document not found');
  await assertWorkspaceFacultyRead(user, doc.workspaceId);
  if (doc.visibility === 'personal') {
    const coordinator = await isWorkspaceKnowledgeCoordinator(
      user,
      doc.workspaceId,
    );
    if (!coordinator && doc.createdByUserId !== user.id && !user.platformStaff) {
      throw ApiError.forbidden('You cannot preview this document');
    }
  }
  return doc;
}

async function resolveVersionId(
  doc: typeof knowledgeDocuments.$inferSelect,
  courseId?: string | null,
): Promise<string | null> {
  if (courseId) {
    const link = await db.query.courseKnowledgeLinks.findFirst({
      where: and(
        eq(courseKnowledgeLinks.courseId, courseId),
        eq(courseKnowledgeLinks.documentId, doc.id),
      ),
    });
    if (link?.pinnedVersionId) return link.pinnedVersionId;
  }
  return doc.currentVersionId;
}

export async function getKnowledgePreviewMeta(
  user: AuthUser,
  documentId: string,
  courseId?: string | null,
): Promise<KnowledgePreviewMeta> {
  const doc = await assertCanPreviewDocument(user, documentId);
  if (courseId) await assertCanManageCourse(user, courseId);
  const versionId = await resolveVersionId(doc, courseId);
  let hasFile = false;
  let mimeType = doc.mimeType;
  if (versionId) {
    const version = await db.query.knowledgeDocumentVersions.findFirst({
      where: eq(knowledgeDocumentVersions.id, versionId),
    });
    hasFile = Boolean(version?.s3Key);
    mimeType = version?.mimeType ?? mimeType;
  }
  return {
    id: doc.id,
    title: doc.title,
    sourceKind: doc.sourceKind,
    mimeType,
    externalUrl: doc.externalUrl,
    hasFile,
    status: doc.status,
  };
}

export async function getKnowledgePreviewBytes(
  user: AuthUser,
  documentId: string,
  courseId?: string | null,
): Promise<{
  bytes: Buffer;
  mimeType: string;
  title: string;
}> {
  const doc = await assertCanPreviewDocument(user, documentId);
  if (courseId) await assertCanManageCourse(user, courseId);
  const versionId = await resolveVersionId(doc, courseId);
  if (!versionId) throw ApiError.notFound('No file version available');
  const version = await db.query.knowledgeDocumentVersions.findFirst({
    where: eq(knowledgeDocumentVersions.id, versionId),
  });
  if (!version?.s3Key) throw ApiError.notFound('File not stored');
  const bytes = await getMaterialObjectBytes(version.s3Key);
  return {
    bytes,
    mimeType: version.mimeType || doc.mimeType || 'application/octet-stream',
    title: doc.title,
  };
}

/** Legacy course_materials row (unmirrored uploads). */
export async function getLegacyMaterialPreviewBytes(
  user: AuthUser,
  materialId: string,
): Promise<{
  bytes: Buffer;
  mimeType: string;
  title: string;
  externalUrl: string | null;
}> {
  const material = await db.query.courseMaterials.findFirst({
    where: and(
      eq(courseMaterials.id, materialId),
      isNull(courseMaterials.deletedAt),
    ),
  });
  if (!material) throw ApiError.notFound('Material not found');
  await assertCanManageCourse(user, material.courseId);
  if (material.externalUrl && !material.s3Key) {
    return {
      bytes: Buffer.alloc(0),
      mimeType: material.mimeType || 'text/plain',
      title: material.title,
      externalUrl: material.externalUrl,
    };
  }
  if (!material.s3Key) throw ApiError.notFound('File not stored');
  const bytes = await getMaterialObjectBytes(material.s3Key);
  return {
    bytes,
    mimeType: material.mimeType || 'application/octet-stream',
    title: material.title,
    externalUrl: material.externalUrl,
  };
}
