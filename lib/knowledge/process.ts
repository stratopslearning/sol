import { and, eq, isNull, lt, or } from 'drizzle-orm';

import { db } from '@/app/db';
import { courseMaterialChunks, courseMaterials } from '@/app/db/schema';
import { chunkText } from '@/lib/knowledge/chunk';
import { embedTexts } from '@/lib/knowledge/embed';
import {
  extractTextFromUpload,
  extractTextFromUrl,
} from '@/lib/knowledge/extract';
import { getMaterialObjectBytes } from '@/lib/knowledge/storage';

/**
 * Extract → chunk → embed → READY/FAILED for one material.
 * Claims with conditional UPDATE so concurrent callers don't double-process.
 */
export async function processMaterial(materialId: string): Promise<void> {
  const claimed = await db
    .update(courseMaterials)
    .set({
      status: 'PROCESSING',
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(courseMaterials.id, materialId),
        isNull(courseMaterials.deletedAt),
        eq(courseMaterials.status, 'PENDING'),
      ),
    )
    .returning();

  if (claimed.length === 0) return;
  const material = claimed[0]!;

  try {
    let text = '';
    if (material.sourceType === 'URL' && material.externalUrl) {
      text = await extractTextFromUrl(material.externalUrl);
    } else if (material.sourceType === 'UPLOAD' && material.s3Key) {
      const buf = await getMaterialObjectBytes(material.s3Key);
      text = await extractTextFromUpload({
        buffer: buf,
        mimeType: material.mimeType,
        fileName: material.s3Key.split('/').pop(),
      });
    } else {
      throw new Error('Material has no fetchable source');
    }

    if (!text || text.length < 20) {
      throw new Error('No usable text extracted from material');
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error('Chunking produced no content');
    }

    const { getCourseWorkspaceId, checkAiBandAvailable } = await import(
      '@/lib/workspace'
    );
    const workspaceId = await getCourseWorkspaceId(material.courseId);
    const aiCap = await checkAiBandAvailable(workspaceId);
    if (!aiCap.ok) {
      await db
        .update(courseMaterials)
        .set({
          status: 'FAILED',
          errorMessage: aiCap.reason.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(courseMaterials.id, materialId));
      return;
    }

    await db
      .delete(courseMaterialChunks)
      .where(eq(courseMaterialChunks.materialId, materialId));

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    await db.insert(courseMaterialChunks).values(
      chunks.map((chunk, i) => ({
        materialId,
        courseId: material.courseId,
        chunkIndex: chunk.index,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        embedding: embeddings[i]!,
      })),
    );

    await db
      .update(courseMaterials)
      .set({ status: 'READY', errorMessage: null, updatedAt: new Date() })
      .where(eq(courseMaterials.id, materialId));

    void (async () => {
      try {
        const { getCourseWorkspaceId, recordAiUsage } = await import(
          '@/lib/workspace'
        );
        const workspaceId = await getCourseWorkspaceId(material.courseId);
        if (workspaceId) {
          await recordAiUsage(workspaceId, 'embed', chunks.length);
        }
      } catch (err) {
        console.warn('[processMaterial] usage meter failed', err);
      }
    })();
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : 'Processing failed';
    await db
      .update(courseMaterials)
      .set({
        status: 'FAILED',
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(courseMaterials.id, materialId));
  }
}

/** Cron helper: pick stuck PENDING / old PROCESSING rows. */
export async function processPendingMaterials(limit = 10): Promise<number> {
  const staleBefore = new Date(Date.now() - 15 * 60_000);
  const pending = await db.query.courseMaterials.findMany({
    where: and(
      isNull(courseMaterials.deletedAt),
      or(
        eq(courseMaterials.status, 'PENDING'),
        and(
          eq(courseMaterials.status, 'PROCESSING'),
          lt(courseMaterials.updatedAt, staleBefore),
        ),
      ),
    ),
    limit,
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  for (const row of pending) {
    if (row.status === 'PROCESSING') {
      await db
        .update(courseMaterials)
        .set({ status: 'PENDING', updatedAt: new Date() })
        .where(eq(courseMaterials.id, row.id));
    }
    await processMaterial(row.id);
  }
  return pending.length;
}
