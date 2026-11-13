import {
  assertStudentCanAccessBook,
  assertStudentCanAccessChapter,
} from '@/lib/books/access';
import { withBasePath } from '@/lib/basePath';
import {
  countTopLevelChapters,
  isMetaTocChapter,
} from '@/lib/books/hierarchy';
import {
  fetchActiveSectionIdsForStudentDefiner,
  fetchBookChaptersTocForBookDefiner,
  fetchStudentBookAssignmentsDefiner,
} from '@/lib/db/bookWriteDefiners';

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
  let sectionIds = await fetchActiveSectionIdsForStudentDefiner(studentId);
  if (opts?.sectionId) {
    if (!sectionIds.includes(opts.sectionId)) return [];
    sectionIds = [opts.sectionId];
  }
  if (sectionIds.length === 0) return [];

  const assignments = await fetchStudentBookAssignmentsDefiner(sectionIds);

  const seen = new Set<string>();
  const items: StudentBookListItem[] = [];

  for (const a of assignments) {
    if (seen.has(a.bookId)) continue;
    seen.add(a.bookId);

    const chapters = await fetchBookChaptersTocForBookDefiner(a.bookId);
    const forBook = assignments.filter(
      (x) => x.bookId === a.bookId && sectionIds.includes(x.sectionId),
    );
    const bookSectionIds = [
      ...new Set(forBook.map((x) => x.sectionId).filter(Boolean)),
    ];
    const sectionNames = forBook
      .map((x) => x.sectionName)
      .filter((n): n is string => Boolean(n));

    const primarySectionId = opts?.sectionId ?? bookSectionIds[0];
    const bookPath = `/dashboard/student/books/${a.bookId}`;
    const href = withBasePath(
      primarySectionId
        ? `${bookPath}?section=${encodeURIComponent(primarySectionId)}`
        : bookPath,
    );

    items.push({
      id: a.bookId,
      title: a.title,
      courseId: a.courseId,
      courseTitle: a.courseTitle,
      chapterCount: countTopLevelChapters(chapters, a.title),
      href,
      sectionNames: [...new Set(sectionNames)],
      sectionIds: bookSectionIds,
    });
  }

  return items.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getStudentBookToc(studentId: string, bookId: string) {
  const book = await assertStudentCanAccessBook(studentId, bookId);
  const chapters = await fetchBookChaptersTocForBookDefiner(bookId);
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
  const siblings = await fetchBookChaptersTocForBookDefiner(book.id);
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
      level: chapter.level,
      markdown: chapter.markdown,
      html: chapter.html,
    },
    toc: siblings,
    prev,
    next,
  };
}
