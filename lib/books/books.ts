import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  bookChapters,
  bookSections,
  hostedBooks,
} from '@/app/db/schema';
import { softDeleteLinkedMaterials } from '@/lib/books/bookKnowledge';
import { ApiError } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import {
  assertCanManageBook,
} from '@/lib/books/access';
import {
  BOOK_EPUB_MIME,
  BOOK_XML_MIME,
  MAX_BOOK_UPLOAD_BYTES,
} from '@/lib/books/constants';
import { countTopLevelChapters } from '@/lib/books/hierarchy';
import { processBookFromBuffer } from '@/lib/books/process';
import { scheduleBookProcess } from '@/lib/books/scheduleProcess';
import type {
  BookChapterSummary,
  BookChapterTocItem,
  BookSummary,
  BookWithChapters,
} from '@/lib/books/types';
import type { UserData } from '@/lib/getOrCreateUser';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import {
  buildMaterialS3Key,
  isS3Configured,
  putMaterialObject,
} from '@/lib/knowledge/storage';
import { assertSafeMaterialUrl } from '@/lib/knowledge/urlSafety';
import { getCourseWorkspaceId } from '@/lib/workspace';

type AuthUser = Pick<UserData, 'id' | 'clerkId'> & { platformStaff?: boolean | null };

function toSummary(
  row: typeof hostedBooks.$inferSelect,
  chapterCount: number,
): BookSummary {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    sourceKind: row.sourceKind as BookSummary['sourceKind'],
    sourceUrl: row.sourceUrl,
    status: row.status as BookSummary['status'],
    errorMessage: row.errorMessage,
    isReleased: row.isReleased,
    chapterCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listCourseBooks(
  user: AuthUser,
  courseId: string,
): Promise<BookWithChapters[]> {
  await assertCanManageCourse(user, courseId);
  const rows = await db.query.hostedBooks.findMany({
    where: and(
      eq(hostedBooks.courseId, courseId),
      isNull(hostedBooks.deletedAt),
    ),
    orderBy: [desc(hostedBooks.createdAt)],
  });
  const bookIds = rows.map((r) => r.id);

  const tocByBook = new Map<string, BookChapterTocItem[]>();
  if (bookIds.length > 0) {
    const chapterRows = await db
      .select({
        id: bookChapters.id,
        bookId: bookChapters.bookId,
        position: bookChapters.position,
        title: bookChapters.title,
        partTitle: bookChapters.partTitle,
        parentId: bookChapters.parentId,
        level: bookChapters.level,
      })
      .from(bookChapters)
      .where(
        and(
          inArray(bookChapters.bookId, bookIds),
          isNull(bookChapters.deletedAt),
        ),
      )
      .orderBy(asc(bookChapters.position));
    for (const ch of chapterRows) {
      const list = tocByBook.get(ch.bookId) ?? [];
      list.push({
        id: ch.id,
        position: ch.position,
        title: ch.title,
        partTitle: ch.partTitle,
        parentId: ch.parentId,
        level: ch.level ?? 0,
      });
      tocByBook.set(ch.bookId, list);
    }
  }

  return rows.map((r) => {
    const chapters = tocByBook.get(r.id) ?? [];
    return {
      ...toSummary(r, countTopLevelChapters(chapters, r.title)),
      chapters,
    };
  });
}

export async function getBookDetail(
  user: AuthUser,
  bookId: string,
): Promise<{ book: BookSummary; chapters: BookChapterSummary[] }> {
  const book = await assertCanManageBook(user, bookId);
  const chapters = await db.query.bookChapters.findMany({
    where: and(
      eq(bookChapters.bookId, bookId),
      isNull(bookChapters.deletedAt),
    ),
    orderBy: [asc(bookChapters.position)],
  });
  return {
    book: toSummary(book, countTopLevelChapters(chapters, book.title)),
    chapters: chapters.map((c) => ({
      id: c.id,
      bookId: c.bookId,
      position: c.position,
      title: c.title,
      slug: c.slug,
      partTitle: c.partTitle,
      parentId: c.parentId,
      level: c.level ?? 0,
      sourceUrl: c.sourceUrl,
      materialId: c.materialId,
      markdownLength: c.markdown.length,
    })),
  };
}

export async function importBookFromUrl(
  user: AuthUser,
  opts: { courseId: string; url: string; title?: string },
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<BookSummary> {
  await assertCanManageCourse(user, opts.courseId);
  let parsed: URL;
  try {
    parsed = assertSafeMaterialUrl(opts.url);
  } catch (e) {
    throw ApiError.badRequest(
      e instanceof Error ? e.message : 'Invalid URL',
    );
  }

  const title =
    opts.title?.trim() ||
    parsed.pathname.split('/').filter(Boolean)[0] ||
    'Imported webbook';

  const [row] = await db
    .insert(hostedBooks)
    .values({
      courseId: opts.courseId,
      createdByUserId: user.id,
      title,
      sourceKind: 'WEBBOOK_URL',
      sourceUrl: parsed.toString(),
      status: 'PENDING',
    })
    .returning();

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.book.create',
    targetType: 'hosted_book',
    targetId: row.id,
    metadata: { courseId: opts.courseId, sourceKind: 'WEBBOOK_URL' },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  scheduleBookProcess(row.id, await getCourseWorkspaceId(opts.courseId));
  return toSummary(row, 0);
}

export async function importBookFromUpload(
  user: AuthUser,
  opts: {
    courseId: string;
    title?: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  },
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<BookSummary> {
  await assertCanManageCourse(user, opts.courseId);

  if (opts.buffer.byteLength > MAX_BOOK_UPLOAD_BYTES) {
    throw ApiError.badRequest('Book file exceeds 50 MB limit');
  }

  const lower = opts.fileName.toLowerCase();
  const mime = (opts.mimeType || '').toLowerCase();
  const isEpub =
    lower.endsWith('.epub') || BOOK_EPUB_MIME.has(mime);
  const isXml =
    lower.endsWith('.xml') || BOOK_XML_MIME.has(mime);

  if (!isEpub && !isXml) {
    throw ApiError.badRequest(
      'Unsupported book file. Upload an EPUB or Pressbooks XML export (PDF is not chapter-structured — add it as a regular material instead).',
    );
  }

  const sourceKind = isEpub ? 'EPUB' : 'PRESSBOOKS_XML';
  const title =
    opts.title?.trim() ||
    opts.fileName.replace(/\.[^.]+$/, '') ||
    'Imported book';

  const [row] = await db
    .insert(hostedBooks)
    .values({
      courseId: opts.courseId,
      createdByUserId: user.id,
      title,
      sourceKind,
      status: 'PENDING',
    })
    .returning();

  // Best-effort S3 archive. Chapter markdown lives in Postgres — import must
  // not fail when local AWS credentials are expired or S3 is unreachable.
  if (isS3Configured()) {
    const key = buildMaterialS3Key(
      opts.courseId,
      row.id,
      opts.fileName || (isEpub ? 'book.epub' : 'book.xml'),
    );
    try {
      await putMaterialObject({
        key,
        body: opts.buffer,
        contentType: isEpub ? 'application/epub+zip' : 'application/xml',
      });
      await db
        .update(hostedBooks)
        .set({ s3Key: key, updatedAt: new Date() })
        .where(eq(hostedBooks.id, row.id));
    } catch (err) {
      console.warn('[importBookFromUpload] S3 store failed; processing buffer', {
        bookId: row.id,
        err: err instanceof Error ? err.message : err,
      });
    }
  }

  // Always parse from the upload buffer — avoids a second S3 round-trip and
  // works when S3 is misconfigured.
  await processBookFromBuffer(row.id, opts.buffer, sourceKind);

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.book.create',
    targetType: 'hosted_book',
    targetId: row.id,
    metadata: {
      courseId: opts.courseId,
      sourceKind,
      byteSize: opts.buffer.byteLength,
    },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  const refreshed = await db.query.hostedBooks.findFirst({
    where: eq(hostedBooks.id, row.id),
  });
  const chapters = await db.query.bookChapters.findMany({
    where: and(
      eq(bookChapters.bookId, row.id),
      isNull(bookChapters.deletedAt),
    ),
    columns: { id: true, title: true, parentId: true, level: true },
  });

  if (refreshed?.status === 'FAILED') {
    throw ApiError.badRequest(
      refreshed.errorMessage || 'Could not parse book file',
    );
  }

  const resolvedTitle = refreshed?.title ?? row.title;
  return toSummary(
    refreshed ?? row,
    countTopLevelChapters(chapters, resolvedTitle),
  );
}

/** Re-queue parse so chapters get sanitized HTML (and refreshed markdown). */
export async function reprocessBook(
  user: AuthUser,
  bookId: string,
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<BookSummary> {
  const book = await assertCanManageBook(user, bookId);
  if (book.status === 'PROCESSING' || book.status === 'PENDING') {
    throw ApiError.badRequest('Book is already processing');
  }
  const kind = book.sourceKind;
  if (kind === 'WEBBOOK_URL' && !book.sourceUrl) {
    throw ApiError.badRequest('Book has no source URL to reprocess');
  }
  if ((kind === 'EPUB' || kind === 'PRESSBOOKS_XML') && !book.s3Key) {
    throw ApiError.badRequest(
      'Original file is missing — upload the book again',
    );
  }

  const [updated] = await db
    .update(hostedBooks)
    .set({
      status: 'PENDING',
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(hostedBooks.id, bookId))
    .returning();

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.book.reprocess',
    targetType: 'hosted_book',
    targetId: bookId,
    metadata: { sourceKind: kind },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  scheduleBookProcess(bookId, await getCourseWorkspaceId(book.courseId));
  return toSummary(updated, 0);
}

export async function releaseBook(
  user: AuthUser,
  bookId: string,
  opts?: { sectionIds?: string[] },
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<BookSummary> {
  const book = await assertCanManageBook(user, bookId);
  if (book.status !== 'READY') {
    throw ApiError.badRequest('Book must be ready before release');
  }

  const teachable = await listTeachableSectionIdsForCourse(
    user,
    book.courseId,
  );
  const sectionIds =
    opts?.sectionIds && opts.sectionIds.length > 0
      ? opts.sectionIds.filter((id) => teachable.includes(id))
      : teachable;

  if (sectionIds.length === 0) {
    throw ApiError.badRequest('No teachable sections to assign');
  }

  await db.delete(bookSections).where(eq(bookSections.bookId, bookId));
  await db.insert(bookSections).values(
    sectionIds.map((sectionId) => ({
      bookId,
      sectionId,
      assignedBy: user.id,
    })),
  );

  const [updated] = await db
    .update(hostedBooks)
    .set({ isReleased: true, updatedAt: new Date() })
    .where(eq(hostedBooks.id, bookId))
    .returning();

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.book.release',
    targetType: 'hosted_book',
    targetId: bookId,
    metadata: { sectionIds },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  const chapters = await db.query.bookChapters.findMany({
    where: and(
      eq(bookChapters.bookId, bookId),
      isNull(bookChapters.deletedAt),
    ),
    columns: { title: true, parentId: true, level: true },
  });
  return toSummary(
    updated,
    countTopLevelChapters(chapters, updated.title),
  );
}

export async function softDeleteBook(
  user: AuthUser,
  bookId: string,
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  await softDeleteBooks(user, [bookId], audit);
}

export async function softDeleteBooks(
  user: AuthUser,
  bookIds: string[],
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<{ deleted: number }> {
  const uniqueIds = [...new Set(bookIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw ApiError.badRequest('No books selected');
  }
  if (uniqueIds.length > 100) {
    throw ApiError.badRequest('Too many books selected (max 100)');
  }

  const books = [];
  for (const id of uniqueIds) {
    books.push(await assertCanManageBook(user, id));
  }

  const chapters = await db
    .select({
      bookId: bookChapters.bookId,
      materialId: bookChapters.materialId,
    })
    .from(bookChapters)
    .where(
      and(
        inArray(bookChapters.bookId, uniqueIds),
        isNull(bookChapters.deletedAt),
      ),
    );

  const now = new Date();
  await db
    .update(hostedBooks)
    .set({ deletedAt: now, updatedAt: now })
    .where(inArray(hostedBooks.id, uniqueIds));
  await db
    .update(bookChapters)
    .set({ deletedAt: now, updatedAt: now })
    .where(inArray(bookChapters.bookId, uniqueIds));
  await softDeleteLinkedMaterials(
    chapters
      .map((c) => c.materialId)
      .filter((id): id is string => id != null),
  );

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.books.soft_delete',
    targetType: 'hosted_book',
    targetId: uniqueIds[0]!,
    metadata: {
      courseId: books[0]!.courseId,
      bookIds: uniqueIds,
      deleted: uniqueIds.length,
    },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  return { deleted: uniqueIds.length };
}

export async function softDeleteChapter(
  user: AuthUser,
  bookId: string,
  chapterId: string,
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  await softDeleteChapters(user, bookId, [chapterId], audit);
}

export async function softDeleteChapters(
  user: AuthUser,
  bookId: string,
  chapterIds: string[],
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<{ deleted: number }> {
  const book = await assertCanManageBook(user, bookId);
  const uniqueIds = [...new Set(chapterIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw ApiError.badRequest('No chapters selected');
  }

  const chapters = await db.query.bookChapters.findMany({
    where: and(
      eq(bookChapters.bookId, bookId),
      inArray(bookChapters.id, uniqueIds),
      isNull(bookChapters.deletedAt),
    ),
  });
  if (chapters.length === 0) throw ApiError.notFound('Chapter not found');

  const now = new Date();
  const ids = chapters.map((c) => c.id);
  const candidateMaterialIds = [
    ...new Set(
      chapters
        .map((c) => c.materialId)
        .filter((id): id is string => id != null),
    ),
  ];

  await db
    .update(bookChapters)
    .set({ deletedAt: now, updatedAt: now })
    .where(inArray(bookChapters.id, ids));

  // Shared book material must stay while other chapters still reference it.
  const orphanMaterialIds: string[] = [];
  for (const materialId of candidateMaterialIds) {
    const stillLinked = await db.query.bookChapters.findFirst({
      where: and(
        eq(bookChapters.bookId, bookId),
        eq(bookChapters.materialId, materialId),
        isNull(bookChapters.deletedAt),
      ),
      columns: { id: true },
    });
    if (!stillLinked) orphanMaterialIds.push(materialId);
  }
  await softDeleteLinkedMaterials(orphanMaterialIds);

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.book.chapters.soft_delete',
    targetType: 'hosted_book',
    targetId: bookId,
    metadata: {
      courseId: book.courseId,
      chapterIds: ids,
      deleted: ids.length,
    },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  return { deleted: ids.length };
}
