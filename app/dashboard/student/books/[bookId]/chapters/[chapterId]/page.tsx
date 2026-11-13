import { notFound } from 'next/navigation';

import { StudentChapterReader } from '@/components/books/StudentChapterReader';
import { ApiError } from '@/lib/api/errors';
import { requireStudent } from '@/lib/auth';
import { getStudentChapter } from '@/lib/books';
import { resolveStudentSectionBreadcrumb } from '@/lib/student/resolveSectionBreadcrumb';

export default async function StudentChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await requireStudent();
  const { bookId, chapterId } = await params;
  const { section: sectionParam } = await searchParams;

  let detail: Awaited<ReturnType<typeof getStudentChapter>>;
  try {
    detail = await getStudentChapter(user.id, chapterId);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  if (detail.book.id !== bookId) notFound();

  const section = await resolveStudentSectionBreadcrumb(
    user.id,
    sectionParam,
  );

  return (
    <StudentChapterReader
      user={user}
      book={detail.book}
      chapter={detail.chapter}
      toc={detail.toc}
      prev={detail.prev}
      next={detail.next}
      section={section}
    />
  );
}
