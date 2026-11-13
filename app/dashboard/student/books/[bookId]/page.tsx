import { notFound } from 'next/navigation';

import { StudentBookToc } from '@/components/books/StudentBookToc';
import { ApiError } from '@/lib/api/errors';
import { requireStudent } from '@/lib/auth';
import { getStudentBookToc } from '@/lib/books';
import { countTopLevelChapters } from '@/lib/books/hierarchy';
import { resolveStudentSectionBreadcrumb } from '@/lib/student/resolveSectionBreadcrumb';

export default async function StudentBookTocPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await requireStudent();
  const { bookId } = await params;
  const { section: sectionParam } = await searchParams;

  let book: Awaited<ReturnType<typeof getStudentBookToc>>;
  try {
    book = await getStudentBookToc(user.id, bookId);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  const section = await resolveStudentSectionBreadcrumb(
    user.id,
    sectionParam,
  );
  const chapterCount = countTopLevelChapters(book.chapters, book.title);

  return (
    <StudentBookToc
      user={user}
      book={{ id: book.id, title: book.title }}
      chapters={book.chapters}
      section={section}
      chapterCount={chapterCount}
    />
  );
}
