import { notFound } from 'next/navigation';

import { StudentChapterReader } from '@/components/books/StudentChapterReader';
import { ApiError } from '@/lib/api/errors';
import { requireProfessor } from '@/lib/auth';
import { getFacultyChapter } from '@/lib/books';

export default async function ProfessorChapterPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const user = await requireProfessor();
  const { bookId, chapterId } = await params;

  let detail: Awaited<ReturnType<typeof getFacultyChapter>>;
  try {
    detail = await getFacultyChapter(user, chapterId);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  if (detail.book.id !== bookId) notFound();

  return (
    <StudentChapterReader
      user={user}
      book={detail.book}
      chapter={detail.chapter}
      toc={detail.toc}
      prev={detail.prev}
      next={detail.next}
      section={null}
      audience="professor"
    />
  );
}
