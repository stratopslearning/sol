'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen } from '@/components/icons';

import { withBasePath } from '@/lib/basePath';
import {
  findLatestBookLastRead,
  type BookLastRead,
} from '@/lib/books/readingProgress';

type BookRef = { id: string; title: string };

export function ContinueReadingCard({
  books,
  sectionId,
}: {
  books: BookRef[];
  sectionId: string;
}) {
  const [entry, setEntry] = useState<
    (BookLastRead & { bookTitle: string }) | null
  >(null);

  useEffect(() => {
    const latest = findLatestBookLastRead(books.map((b) => b.id));
    if (!latest) {
      setEntry(null);
      return;
    }
    const book = books.find((b) => b.id === latest.bookId);
    if (!book) {
      setEntry(null);
      return;
    }
    setEntry({ ...latest, bookTitle: book.title });
  }, [books]);

  if (!entry) return null;

  const href = withBasePath(
    `/dashboard/student/books/${entry.bookId}/chapters/${entry.chapterId}?section=${encodeURIComponent(sectionId)}`,
  );

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-rule/80 bg-surface px-4 py-4 transition-colors hover:border-rule-strong"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rule text-ink-muted">
        <BookOpen className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Continue reading
        </p>
        <p className="mt-0.5 truncate font-medium text-ink">{entry.bookTitle}</p>
        <p className="mt-0.5 truncate text-sm text-ink-muted">
          {entry.chapterTitle}
        </p>
      </div>
    </Link>
  );
}
