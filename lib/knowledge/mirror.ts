import { createHash } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courseKnowledgeLinks,
  courseMaterials,
  knowledgeDocuments,
  knowledgeDocumentVersions,
} from '@/app/db/schema';
import { scheduleKnowledgeDocumentProcess } from '@/lib/knowledge/scheduleDocumentProcess';
import {
  buildKnowledgeS3Key,
  isS3Configured,
  putMaterialObject,
} from '@/lib/knowledge/storage';
import { getCourseWorkspaceId } from '@/lib/workspace';

/**
 * Dual-write a course_materials row into the workspace Knowledge library
 * (document + v1 + course link). Idempotent via legacy_material_id.
 */
export async function mirrorCourseMaterialToKnowledge(
  materialId: string,
  opts?: { buffer?: Buffer; process?: boolean },
): Promise<string | null> {
  const material = await db.query.courseMaterials.findFirst({
    where: and(
      eq(courseMaterials.id, materialId),
      isNull(courseMaterials.deletedAt),
    ),
  });
  if (!material) return null;

  const workspaceId = await getCourseWorkspaceId(material.courseId);
  if (!workspaceId) return null;

  const existing = await db.query.knowledgeDocuments.findFirst({
    where: and(
      eq(knowledgeDocuments.legacyMaterialId, materialId),
      isNull(knowledgeDocuments.deletedAt),
    ),
  });
  if (existing) {
    await db
      .insert(courseKnowledgeLinks)
      .values({
        courseId: material.courseId,
        documentId: existing.id,
        linkedByUserId: material.uploadedByUserId,
        pinnedVersionId: existing.currentVersionId,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
    return existing.id;
  }

  const sourceKind =
    material.sourceType === 'URL' ? ('URL' as const) : ('UPLOAD' as const);

  const [doc] = await db
    .insert(knowledgeDocuments)
    .values({
      workspaceId,
      tenantId: workspaceId,
      title: material.title,
      sourceKind,
      mimeType: material.mimeType,
      byteSize: material.byteSize,
      externalUrl: material.externalUrl,
      status: material.status === 'READY' ? 'READY' : 'PENDING',
      errorMessage: material.errorMessage,
      visibility: 'workspace',
      legacyMaterialId: material.id,
      createdByUserId: material.uploadedByUserId,
    })
    .returning();

  let s3Key = material.s3Key;
  // Prefer workspace key when we have bytes
  if (opts?.buffer && isS3Configured()) {
    s3Key = buildKnowledgeS3Key(
      workspaceId,
      doc!.id,
      1,
      material.title.replace(/[^\w.-]+/g, '_').slice(0, 120) || 'upload.bin',
    );
    await putMaterialObject({
      key: s3Key,
      body: opts.buffer,
      contentType: material.mimeType ?? 'application/octet-stream',
    });
  }

  const checksum = opts?.buffer
    ? createHash('sha256').update(opts.buffer).digest('hex')
    : null;

  const [version] = await db
    .insert(knowledgeDocumentVersions)
    .values({
      documentId: doc!.id,
      tenantId: workspaceId,
      version: 1,
      s3Key,
      checksum,
      byteSize: material.byteSize,
      mimeType: material.mimeType,
      createdByUserId: material.uploadedByUserId,
    })
    .returning();

  await db
    .update(knowledgeDocuments)
    .set({ currentVersionId: version!.id, updatedAt: new Date() })
    .where(eq(knowledgeDocuments.id, doc!.id));

  await db
    .insert(courseKnowledgeLinks)
    .values({
      courseId: material.courseId,
      documentId: doc!.id,
      linkedByUserId: material.uploadedByUserId,
      pinnedVersionId: version!.id,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  if (opts?.process !== false && material.status !== 'READY') {
    scheduleKnowledgeDocumentProcess(doc!.id, workspaceId);
  }

  return doc!.id;
}

/** Soft-delete mirrored knowledge docs when legacy materials are removed. */
export async function softDeleteMirroredKnowledgeDocs(
  materialIds: string[],
): Promise<void> {
  if (materialIds.length === 0) return;
  const { softDeleteMirroredKnowledgeDocsDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  await softDeleteMirroredKnowledgeDocsDefiner(materialIds);
}
