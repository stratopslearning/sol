/** Prefer parent/child hierarchy; fall back to partTitle groups for legacy books. */
export function groupChaptersForToc<
  T extends {
    parentId: string | null;
    level?: number | null;
    partTitle?: string | null;
  },
>(chapters: T[]): { part: string | null; chapters: T[] }[] {
  const hasTree = chapters.some((c) => c.parentId || (c.level ?? 0) > 0);
  if (hasTree) {
    return [{ part: null, chapters }];
  }
  const groups: { part: string | null; chapters: T[] }[] = [];
  for (const ch of chapters) {
    const part = ch.partTitle?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.part === part) {
      last.chapters.push(ch);
    } else {
      groups.push({ part, chapters: [ch] });
    }
  }
  return groups;
}

export function bookHref(
  bookId: string,
  opts?: { sectionId?: string | null; chapterId?: string },
): string {
  const base = opts?.chapterId
    ? `/dashboard/student/books/${bookId}/chapters/${opts.chapterId}`
    : `/dashboard/student/books/${bookId}`;
  if (opts?.sectionId) {
    return `${base}?section=${encodeURIComponent(opts.sectionId)}`;
  }
  return base;
}
