import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  bookChapters,
  bookSections,
  hostedBooks,
  studentSections,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id'> & { platformStaff?: boolean | null };

export async function assertCanManageBook(user: AuthUser, bookId: string) {
  const book = await db.query.hostedBooks.findFirst({
    where: and(eq(hostedBooks.id, bookId), isNull(hostedBooks.deletedAt)),
  });
  if (!book) throw ApiError.notFound('Book not found');
  await assertCanManageCourse(user, book.courseId);
  return book;
}

/** Student may access a released book assigned to one of their active sections. */
export async function assertStudentCanAccessBook(
  studentId: string,
  bookId: string,
) {
  const book = await db.query.hostedBooks.findFirst({
    where: and(
      eq(hostedBooks.id, bookId),
      eq(hostedBooks.isReleased, true),
      eq(hostedBooks.status, 'READY'),
      isNull(hostedBooks.deletedAt),
    ),
  });
  if (!book) throw ApiError.notFound('Book not found');

  const assignments = await db.query.bookSections.findMany({
    where: eq(bookSections.bookId, bookId),
  });
  if (assignments.length === 0) throw ApiError.forbidden('Book not assigned');

  const sectionIds = assignments.map((a) => a.sectionId);
  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
    ),
  });
  const enrolled = new Set(enrollments.map((e) => e.sectionId));
  const ok = sectionIds.some((id) => enrolled.has(id));
  if (!ok) throw ApiError.forbidden('You are not enrolled in this book');

  return book;
}

export async function assertStudentCanAccessChapter(
  studentId: string,
  chapterId: string,
) {
  const chapter = await db.query.bookChapters.findFirst({
    where: and(eq(bookChapters.id, chapterId), isNull(bookChapters.deletedAt)),
  });
  if (!chapter) throw ApiError.notFound('Chapter not found');
  const book = await assertStudentCanAccessBook(studentId, chapter.bookId);
  return { book, chapter };
}
