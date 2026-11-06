'use client';

import { useEffect } from 'react';

import { BookChapterBody } from '@/components/books/BookChapterBody';
import { StudentBookReaderShell } from '@/components/books/StudentBookReaderShell';
import { writeBookLastRead } from '@/lib/books/readingProgress';

type TocItem = {
  id: string;
  title: string;
  parentId: string | null;
  level?: number | null;
  partTitle?: string | null;
  position?: number;
};

type NavUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  paid?: boolean | null;
};

export function StudentChapterReader({
  user,
  book,
  chapter,
  toc,
  prev,
  next,
  section,
}: {
  user: NavUser;
  book: { id: string; title: string };
  chapter: {
    id: string;
    title: string;
    partTitle: string | null;
    level: number;
    markdown: string;
    html?: string | null;
  };
  toc: TocItem[];
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  section: { id: string; name: string } | null;
}) {
  useEffect(() => {
    writeBookLastRead({
      bookId: book.id,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      at: Date.now(),
    });
  }, [book.id, chapter.id, chapter.title]);

  return (
    <StudentBookReaderShell
      user={user}
      book={book}
      chapters={toc}
      section={section}
      activeChapterId={chapter.id}
      prev={prev}
      next={next}
    >
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-10 sm:py-10 md:px-12">
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          {chapter.title}
        </h1>
        <article className="mt-8">
          <BookChapterBody
            html={chapter.html}
            markdown={chapter.markdown}
            chapterTitle={chapter.title}
          />
        </article>
      </div>
    </StudentBookReaderShell>
  );
}
