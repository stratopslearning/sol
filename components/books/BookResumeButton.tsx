'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { withBasePath } from '@/lib/basePath';
import {
  clearBookLastRead,
  readBookLastRead,
  resolveBookLastReadChapter,
  writeBookLastRead,
} from '@/lib/books/readingProgress';
import { bookHref } from '@/lib/books/toc';

export function BookResumeButton({
  bookId,
  sectionId,
  chapters,
  audience = 'student',
}: {
  bookId: string;
  sectionId?: string | null;
  /** Current TOC — used to remap stale chapter ids after reprocess. */
  chapters: Array<{ id: string; title: string }>;
  audience?: 'student' | 'professor';
}) {
  const [href, setHref] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const entry = readBookLastRead(bookId);
    if (!entry) {
      setHref(null);
      setLabel(null);
      return;
    }

    const resolved = resolveBookLastReadChapter(entry, chapters);
    if (!resolved) {
      clearBookLastRead(bookId);
      setHref(null);
      setLabel(null);
      return;
    }

    // Heal localStorage when reprocess issued new chapter ids.
    if (resolved.id !== entry.chapterId) {
      writeBookLastRead({
        bookId,
        chapterId: resolved.id,
        chapterTitle: resolved.title,
        at: entry.at || Date.now(),
      });
    }

    setHref(
      withBasePath(
        bookHref(bookId, {
          sectionId,
          chapterId: resolved.id,
          audience,
        }),
      ),
    );
    setLabel(resolved.title);
  }, [bookId, sectionId, chapters, audience]);

  if (!href || !label) return null;

  return (
    <Button asChild size="sm">
      <Link href={href}>Continue: {label}</Link>
    </Button>
  );
}
