import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { courseMaterialChunks, courseMaterials } from '@/app/db/schema';
import { chunkText } from '@/lib/knowledge/chunk';
import { embedTexts } from '@/lib/knowledge/embed';

/**
 * Create one Knowledge material + embedded chunks for an entire hosted book
 * (chapters live on book_chapters; this is for RAG only).
 */
export async function indexBookAsMaterial(opts: {
  courseId: string;
  uploadedByUserId: string;
  title: string;
  markdown: string;
}): Promise<string> {
  const [material] = await db
    .insert(courseMaterials)
    .values({
      courseId: opts.courseId,
      uploadedByUserId: opts.uploadedByUserId,
      title: opts.title.slice(0, 200),
      sourceType: 'UPLOAD',
      mimeType: 'text/markdown',
      byteSize: Buffer.byteLength(opts.markdown, 'utf8'),
      status: 'PROCESSING',
    })
    .returning();

  try {
    const text = opts.markdown.trim();
    if (text.length < 20) {
      throw new Error('Book content too short to index');
    }
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error('Chunking produced no content');

    const embeddings = await embedTexts(chunks.map((c) => c.content));
    await db.insert(courseMaterialChunks).values(
      chunks.map((chunk, i) => ({
        materialId: material.id,
        courseId: opts.courseId,
        chunkIndex: chunk.index,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        embedding: embeddings[i]!,
      })),
    );

    await db
      .update(courseMaterials)
      .set({ status: 'READY', errorMessage: null, updatedAt: new Date() })
      .where(eq(courseMaterials.id, material.id));

    void (async () => {
      try {
        const { getCourseWorkspaceId, recordAiUsage } = await import(
          '@/lib/workspace'
        );
        const workspaceId = await getCourseWorkspaceId(opts.courseId);
        if (workspaceId) {
          await recordAiUsage(workspaceId, 'embed', chunks.length);
        }
      } catch (err) {
        console.warn('[indexBookAsMaterial] usage meter failed', err);
      }
    })();

    return material.id;
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : 'Indexing failed';
    await db
      .update(courseMaterials)
      .set({
        status: 'FAILED',
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(courseMaterials.id, material.id));
    throw err;
  }
}

/** @deprecated Use indexBookAsMaterial — kept for any leftover imports. */
export const indexChapterAsMaterial = indexBookAsMaterial;
