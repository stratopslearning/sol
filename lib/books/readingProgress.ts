/** Client-side last-read markers for hosted books (no server progress yet). */

export type BookLastRead = {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  at: number;
};

const bookKey = (bookId: string) => `sol:book-last-read:${bookId}`;

export function readBookLastRead(bookId: string): BookLastRead | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(bookKey(bookId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookLastRead;
    if (
      !parsed?.bookId ||
      !parsed?.chapterId ||
      parsed.bookId !== bookId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeBookLastRead(entry: BookLastRead): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      bookKey(entry.bookId),
      JSON.stringify({ ...entry, at: entry.at || Date.now() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearBookLastRead(bookId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(bookKey(bookId));
  } catch {
    // ignore
  }
}

/**
 * Map a stored last-read marker onto the current chapter list.
 * Reprocess soft-deletes old chapter rows and inserts new ids; title match recovers resume.
 */
export function resolveBookLastReadChapter(
  entry: BookLastRead,
  chapters: Array<{ id: string; title: string }>,
): { id: string; title: string } | null {
  const byId = chapters.find((c) => c.id === entry.chapterId);
  if (byId) return { id: byId.id, title: byId.title };

  const want = entry.chapterTitle.trim().toLowerCase();
  if (!want) return null;
  const byTitle = chapters.find((c) => c.title.trim().toLowerCase() === want);
  if (byTitle) return { id: byTitle.id, title: byTitle.title };

  return null;
}

/** Among known books, return the most recently read marker. */
export function findLatestBookLastRead(
  bookIds: string[],
): BookLastRead | null {
  let best: BookLastRead | null = null;
  for (const id of bookIds) {
    const entry = readBookLastRead(id);
    if (!entry) continue;
    if (!best || entry.at > best.at) best = entry;
  }
  return best;
}
