import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { bookChapters } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { assertCanManageBook } from '@/lib/books/access';
import { isMetaTocChapter } from '@/lib/books/hierarchy';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id'> & { platformStaff?: boolean | null };

/** Faculty preview: same TOC shape as student, gated by course manage access. */
export async function getFacultyBookToc(user: AuthUser, bookId: string) {
  const book = await assertCanManageBook(user, bookId);
  const chapters = await db.query.bookChapters.findMany({
    where: and(
      eq(bookChapters.bookId, bookId),
      isNull(bookChapters.deletedAt),
    ),
    orderBy: [asc(bookChapters.position)],
    columns: {
      id: true,
      title: true,
      slug: true,
      partTitle: true,
      position: true,
      parentId: true,
      level: true,
    },
  });
  return {
    id: book.id,
    title: book.title,
    courseId: book.courseId,
    chapters,
  };
}

export async function getFacultyChapter(
  user: AuthUser,
  chapterId: string,
) {
  const chapter = await db.query.bookChapters.findFirst({
    where: and(eq(bookChapters.id, chapterId), isNull(bookChapters.deletedAt)),
  });
  if (!chapter) throw ApiError.notFound('Chapter not found');
  const book = await assertCanManageBook(user, chapter.bookId);

  const siblings = await db.query.bookChapters.findMany({
    where: and(
      eq(bookChapters.bookId, book.id),
      isNull(bookChapters.deletedAt),
    ),
    orderBy: [asc(bookChapters.position)],
    columns: {
      id: true,
      title: true,
      position: true,
      parentId: true,
      level: true,
      partTitle: true,
    },
  });
  const idx = siblings.findIndex((s) => s.id === chapter.id);
  const isMeta = (s: { title: string }) => isMetaTocChapter(s, book.title);
  let prev: (typeof siblings)[number] | null = null;
  for (let i = idx - 1; i >= 0; i -= 1) {
    const cand = siblings[i]!;
    if (!isMeta(cand)) {
      prev = cand;
      break;
    }
  }
  let next: (typeof siblings)[number] | null = null;
  for (let i = idx + 1; i < siblings.length; i += 1) {
    const cand = siblings[i]!;
    if (!isMeta(cand)) {
      next = cand;
      break;
    }
  }

  return {
    book: {
      id: book.id,
      title: book.title,
      courseId: book.courseId,
      sourceKind: book.sourceKind as
        | 'WEBBOOK_URL'
        | 'EPUB'
        | 'PRESSBOOKS_XML'
        | 'PDF',
    },
    chapter: {
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      partTitle: chapter.partTitle,
      position: chapter.position,
      parentId: chapter.parentId,
      level: chapter.level ?? 0,
      markdown: chapter.markdown,
      html: chapter.html ?? null,
    },
    toc: siblings,
    prev,
    next,
  };
}
