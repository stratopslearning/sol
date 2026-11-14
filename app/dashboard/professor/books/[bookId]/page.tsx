import { notFound } from 'next/navigation';

import { StudentBookToc } from '@/components/books/StudentBookToc';
import { ApiError } from '@/lib/api/errors';
import { requireProfessor } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';
import { getFacultyBookToc } from '@/lib/books';
import { countTopLevelChapters } from '@/lib/books/hierarchy';

export default async function ProfessorBookTocPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const user = await requireProfessor();
  const { bookId } = await params;

  let book: Awaited<ReturnType<typeof getFacultyBookToc>>;
  try {
    book = await getFacultyBookToc(user, bookId);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  const chapterCount = countTopLevelChapters(book.chapters, book.title);
  const backHref = withBasePath(
    `/dashboard/professor/materials/${book.courseId}`,
  );

  return (
    <StudentBookToc
      user={user}
      book={{ id: book.id, title: book.title }}
      chapters={book.chapters}
      section={null}
      chapterCount={chapterCount}
      audience="professor"
      backHref={backHref}
    />
  );
}
