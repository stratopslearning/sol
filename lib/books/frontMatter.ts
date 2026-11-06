/** Front-matter / meta titles we exclude from “real chapter” counts and outlining. */
const FRONT_MATTER_TITLE =
  /^(cover|front\s*cover|back\s*cover|title(\s*page)?|half[\s-]*title|copyright|imprint|preface|foreword|about(\s+the\s+(author|book|authors))?|acknowledg|table\s+of\s+contents|contents|dedication|how\s+to\s+use|credits|colophon|index|glossary|bibliography|references|appendix|landmarks|start)$/i;

function normalizeComparableTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[.!?:;,"']+$/g, '')
    .replace(/\s+/g, ' ');
}

export function isFrontMatterChapterTitle(title: string): boolean {
  const t = title.trim().replace(/^[\d.]+\s*/, '');
  if (!t) return true;
  if (FRONT_MATTER_TITLE.test(t)) return true;
  const lower = t.toLowerCase();
  return (
    lower.startsWith('about ') ||
    lower.startsWith('acknowledg') ||
    lower.startsWith('how to use') ||
    lower.startsWith('table of contents') ||
    lower.includes('copyright') ||
    lower === 'cover' ||
    lower.startsWith('title page')
  );
}

/** TOC entry that repeats the book title (cover/title leaf), not a numbered chapter. */
export function isBookTitleChapter(
  chapterTitle: string,
  bookTitle: string | null | undefined,
): boolean {
  if (!bookTitle?.trim()) return false;
  return (
    normalizeComparableTitle(chapterTitle) ===
    normalizeComparableTitle(bookTitle)
  );
}

export function isMetaChapterTitle(
  chapterTitle: string,
  bookTitle?: string | null,
): boolean {
  return (
    isFrontMatterChapterTitle(chapterTitle) ||
    isBookTitleChapter(chapterTitle, bookTitle)
  );
}
