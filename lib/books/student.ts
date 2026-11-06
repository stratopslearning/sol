import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  bookChapters,
  bookSections,
  hostedBooks,
  studentSections,
} from '@/app/db/schema';
import {
  assertStudentCanAccessBook,
  assertStudentCanAccessChapter,
} from '@/lib/books/access';
import { withBasePath } from '@/lib/basePath';
import {
  countTopLevelChapters,
  isMetaTocChapter,
} from '@/lib/books/hierarchy';
import { partitionEnrollmentsByConclusion } from '@/lib/sectionAvailability';

export type StudentBookListItem = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  chapterCount: number;
  href: string;
  sectionNames: string[];
  /** Section ids this book is released to (intersection with student’s active enrollments). */
  sectionIds: string[];
};

export async function listStudentBooks(
  studentId: string,
  opts?: { sectionId?: string },
): Promise<StudentBookListItem[]> {
  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { section: { with: { course: true } } },
  });
  const { active: activeEnrollments } =
    partitionEnrollmentsByConclusion(enrollments);
  let sectionIds = activeEnrollments.map((e) => e.sectionId);
  if (opts?.sectionId) {
    if (!sectionIds.includes(opts.sectionId)) return [];
    sectionIds = [opts.sectionId];
  }
  if (sectionIds.length === 0) return [];

  const assignments = await db.query.bookSections.findMany({
    where: inArray(bookSections.sectionId, sectionIds),
    with: {
      book: true,
      section: { with: { course: true } },
    },
  });

  const seen = new Set<string>();
  const items: StudentBookListItem[] = [];

  for (const a of assignments) {
    const book = a.book;
    if (
      !book ||
      book.deletedAt ||
      !book.isReleased ||
      book.status !== 'READY'
    ) {
      continue;
    }
    if (seen.has(book.id)) continue;
    seen.add(book.id);

    const chapters = await db.query.bookChapters.findMany({
      where: and(
        eq(bookChapters.bookId, book.id),
        isNull(bookChapters.deletedAt),
      ),
      columns: { id: true, title: true, parentId: true, level: true },
    });

    const forBook = assignments.filter(
      (x) => x.bookId === book.id && sectionIds.includes(x.sectionId),
    );
    const bookSectionIds = [
      ...new Set(forBook.map((x) => x.sectionId).filter(Boolean)),
    ];
    const sectionNames = forBook
      .map((x) => x.section?.name)
      .filter((n): n is string => Boolean(n));

    const primarySectionId = opts?.sectionId ?? bookSectionIds[0];
    const bookPath = `/dashboard/student/books/${book.id}`;
    const href = withBasePath(
      primarySectionId
        ? `${bookPath}?section=${encodeURIComponent(primarySectionId)}`
        : bookPath,
    );

    items.push({
      id: book.id,
      title: book.title,
      courseId: book.courseId,
      courseTitle: a.section?.course?.title ?? '',
      chapterCount: countTopLevelChapters(chapters, book.title),
      href,
      sectionNames: [...new Set(sectionNames)],
      sectionIds: bookSectionIds,
    });
  }

  return items.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getStudentBookToc(studentId: string, bookId: string) {
  const book = await assertStudentCanAccessBook(studentId, bookId);
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

export async function getStudentChapter(
  studentId: string,
  chapterId: string,
) {
  const { book, chapter } = await assertStudentCanAccessChapter(
    studentId,
    chapterId,
  );
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
  const isMeta = (s: { title: string }) =>
    isMetaTocChapter(s, book.title);
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
    book: { id: book.id, title: book.title },
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
