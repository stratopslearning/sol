import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { bookChapters, hostedBooks } from '@/app/db/schema';
import { indexBookChaptersAsSingleMaterial } from '@/lib/books/bookKnowledge';
import { crawlWebbook } from '@/lib/books/crawlWebbook';
import { flattenParsedChapters } from '@/lib/books/hierarchy';
import { parseEpub } from '@/lib/books/parseEpub';
import { parsePdf } from '@/lib/books/parsePdf';
import { clearYoutubeTitleCache } from '@/lib/books/resolveYoutubeByTitle';
import { parsePressbooksXml } from '@/lib/books/parsePressbooksXml';
import type { ParsedBook } from '@/lib/books/types';
import { getMaterialObjectBytes } from '@/lib/knowledge/storage';

async function persistParsedBook(
  book: typeof hostedBooks.$inferSelect,
  parsed: ParsedBook,
): Promise<void> {
  // Collect prior Knowledge materials before soft-deleting chapters.
  const priorRows = await db
    .select({ materialId: bookChapters.materialId })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, book.id));
  const priorMaterialIds = priorRows
    .map((r) => r.materialId)
    .filter((id): id is string => id != null);

  // Soft-delete prior chapters on reprocess
  await db
    .update(bookChapters)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(bookChapters.bookId, book.id), isNull(bookChapters.deletedAt)),
    );

  const bookTitle = (parsed.title || book.title).slice(0, 300);
  if (parsed.title && parsed.title !== book.title) {
    await db
      .update(hostedBooks)
      .set({ title: bookTitle, updatedAt: new Date() })
      .where(eq(hostedBooks.id, book.id));
  }

  const flat = flattenParsedChapters(parsed.chapters);

  // One Knowledge material for the whole book (RAG); chapters are reader TOC.
  const materialId = await indexBookChaptersAsSingleMaterial({
    bookId: book.id,
    courseId: book.courseId,
    uploadedByUserId: book.createdByUserId,
    bookTitle,
    chapters: flat,
    priorMaterialIds,
  });

  const insertedIds: string[] = [];
  for (let i = 0; i < flat.length; i++) {
    const ch = flat[i]!;
    const parentId =
      ch.parentPosition != null ? (insertedIds[ch.parentPosition] ?? null) : null;
    const [row] = await db
      .insert(bookChapters)
      .values({
        bookId: book.id,
        courseId: book.courseId,
        parentId,
        level: ch.level,
        position: i,
        title: ch.title.slice(0, 300),
        slug: ch.slug.slice(0, 120),
        partTitle: ch.partTitle?.slice(0, 300) ?? null,
        markdown: ch.markdown || `# ${ch.title.slice(0, 300)}\n`,
        html: ch.html?.trim() ? ch.html : null,
        sourceUrl: ch.sourceUrl ?? null,
        materialId,
      })
      .returning({ id: bookChapters.id });
    insertedIds.push(row!.id);
  }

  await db
    .update(hostedBooks)
    .set({
      status: 'READY',
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(hostedBooks.id, book.id));
}

/**
 * Process a PENDING hosted book: parse source → chapters → Knowledge index.
 */
export async function processBook(bookId: string): Promise<void> {
  const claimed = await db
    .update(hostedBooks)
    .set({
      status: 'PROCESSING',
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hostedBooks.id, bookId),
        isNull(hostedBooks.deletedAt),
        eq(hostedBooks.status, 'PENDING'),
      ),
    )
    .returning();

  if (claimed.length === 0) return;
  const book = claimed[0]!;
  clearYoutubeTitleCache();

  try {
    let parsed: ParsedBook;
    if (book.sourceKind === 'WEBBOOK_URL') {
      if (!book.sourceUrl) throw new Error('Book has no source URL');
      parsed = await crawlWebbook(book.sourceUrl);
    } else if (book.sourceKind === 'EPUB') {
      if (!book.s3Key) throw new Error('EPUB book has no stored file');
      const buf = await getMaterialObjectBytes(book.s3Key);
      parsed = await parseEpub(buf);
    } else if (book.sourceKind === 'PRESSBOOKS_XML') {
      if (!book.s3Key) throw new Error('XML book has no stored file');
      const buf = await getMaterialObjectBytes(book.s3Key);
      parsed = await parsePressbooksXml(buf.toString('utf8'));
    } else if (book.sourceKind === 'PDF') {
      if (!book.s3Key) throw new Error('PDF book has no stored file');
      const buf = await getMaterialObjectBytes(book.s3Key);
      parsed = await parsePdf(buf, { title: book.title, fileName: 'book.pdf' });
    } else {
      throw new Error(`Unknown source kind: ${book.sourceKind}`);
    }

    await persistParsedBook(book, parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : 'Book processing failed';
    await db
      .update(hostedBooks)
      .set({
        status: 'FAILED',
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(hostedBooks.id, book.id));
  }
}

/** Process upload buffer inline (local/dev without waiting on S3 re-fetch). */
export async function processBookFromBuffer(
  bookId: string,
  buffer: Buffer,
  kind: 'EPUB' | 'PRESSBOOKS_XML' | 'PDF',
): Promise<void> {
  const claimed = await db
    .update(hostedBooks)
    .set({
      status: 'PROCESSING',
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hostedBooks.id, bookId),
        isNull(hostedBooks.deletedAt),
        eq(hostedBooks.status, 'PENDING'),
      ),
    )
    .returning();

  if (claimed.length === 0) return;
  const book = claimed[0]!;
  clearYoutubeTitleCache();

  try {
    const parsed =
      kind === 'EPUB'
        ? await parseEpub(buffer)
        : kind === 'PDF'
          ? await parsePdf(buffer, { title: book.title, fileName: 'book.pdf' })
          : await parsePressbooksXml(buffer.toString('utf8'));
    await persistParsedBook(book, parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : 'Book processing failed';
    await db
      .update(hostedBooks)
      .set({
        status: 'FAILED',
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(hostedBooks.id, book.id));
  }
}
