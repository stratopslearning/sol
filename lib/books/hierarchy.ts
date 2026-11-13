import { isMetaChapterTitle } from '@/lib/books/frontMatter';
import type { ParsedChapter } from '@/lib/books/types';

/** Max nesting depth (0 = chapter, 1 = sub-chapter). Deeper TOC levels flatten under level 1. */
export const MAX_CHAPTER_LEVEL = 1;

/** Top-level chapter (not a sub-chapter). Prefer parentId; level is a fallback for odd rows. */
export function isTopLevelChapter(ch: {
  parentId: string | null;
  level?: number | null;
}): boolean {
  if (ch.parentId) return false;
  return (ch.level ?? 0) === 0;
}

/** Top-level chapter excluding front matter / book-title leaves. */
export function isTeachableTopLevelChapter(
  ch: {
    parentId: string | null;
    level?: number | null;
    title?: string | null;
  },
  bookTitle?: string | null,
): boolean {
  if (!isTopLevelChapter(ch)) return false;
  if (ch.title != null && isMetaChapterTitle(ch.title, bookTitle)) {
    return false;
  }
  return true;
}

/** True for front matter, book-title leaves, etc. (any level). */
export function isMetaTocChapter(
  ch: { title?: string | null },
  bookTitle?: string | null,
): boolean {
  return ch.title != null && isMetaChapterTitle(ch.title, bookTitle);
}

/**
 * Count teachable chapters only — top-level, excluding front matter
 * (Cover, Title Page, Copyright, TOC, …) and a leaf that repeats the book title.
 */
export function countTopLevelChapters(
  chapters: Array<{
    parentId: string | null;
    level?: number | null;
    title?: string | null;
  }>,
  bookTitle?: string | null,
): number {
  return chapters.filter((ch) => isTeachableTopLevelChapter(ch, bookTitle))
    .length;
}

/**
 * 1-based display index for teachable top-level chapters only.
 * Front matter / title leaves and sub-chapters are omitted (no entry).
 */
export function chapterDisplayIndexMap(
  chapters: Array<{
    id: string;
    parentId: string | null;
    level?: number | null;
    title?: string | null;
  }>,
  bookTitle?: string | null,
): Map<string, number> {
  const map = new Map<string, number>();
  let n = 0;
  for (const ch of chapters) {
    if (!isTeachableTopLevelChapter(ch, bookTitle)) continue;
    n += 1;
    map.set(ch.id, n);
  }
  return map;
}

export type FlatParsedChapter = ParsedChapter & {
  level: number;
  /** Index of parent in the flat array; null for roots. */
  parentPosition: number | null;
};

/**
 * Depth-first flatten of a nested ParsedChapter tree into rows ready for insert.
 * Caps nesting at MAX_CHAPTER_LEVEL (extra depth stays under the nearest level-1).
 */
export function flattenParsedChapters(
  roots: ParsedChapter[],
): FlatParsedChapter[] {
  const out: FlatParsedChapter[] = [];

  function walk(
    nodes: ParsedChapter[],
    parentPosition: number | null,
    level: number,
  ) {
    for (const node of nodes) {
      const cappedLevel = Math.min(level, MAX_CHAPTER_LEVEL);
      const effectiveParent =
        level > MAX_CHAPTER_LEVEL
          ? findAncestorAtLevel(out, parentPosition, MAX_CHAPTER_LEVEL)
          : parentPosition;

      const pos = out.length;
      const { children, ...rest } = node;
      out.push({
        ...rest,
        level: cappedLevel,
        parentPosition: effectiveParent,
        children: undefined,
      });
      if (children && children.length > 0) {
        walk(children, pos, level + 1);
      }
    }
  }

  walk(roots, null, 0);
  return out;
}

function findAncestorAtLevel(
  flat: FlatParsedChapter[],
  startParent: number | null,
  level: number,
): number | null {
  let cur = startParent;
  while (cur != null) {
    const row = flat[cur];
    if (!row) return null;
    if (row.level === level) return cur;
    cur = row.parentPosition;
  }
  return startParent;
}

/** Build a nested tree from depth-tagged TOC entries (0 = root). */
export function treeFromDepthEntries<T extends { depth: number }>(
  entries: T[],
): (T & { children: (T & { children: unknown[] })[] })[] {
  type Node = T & { children: Node[] };
  const roots: Node[] = [];
  const stack: Node[] = [];

  for (const entry of entries) {
    const depth = Math.max(0, entry.depth);
    const node: Node = { ...entry, children: [] };
    while (stack.length > depth) stack.pop();
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.children.push(node);
    }
    stack.push(node);
  }
  return roots;
}
