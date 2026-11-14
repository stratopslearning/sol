import { MAX_BOOK_CHAPTERS } from '@/lib/books/constants';
import { flattenParsedChapters } from '@/lib/books/hierarchy';
import { slugify } from '@/lib/books/htmlToMarkdown';
import { chapterBodiesFromHtml } from '@/lib/books/sanitizeChapterHtml';
import type { ParsedBook, ParsedChapter } from '@/lib/books/types';

function decodeCdata(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tagContent(block: string, tag: string): string | null {
  const m = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    'i',
  ).exec(block);
  return m ? decodeCdata(m[1]).trim() : null;
}

function metaValue(block: string, key: string): string | null {
  const re = new RegExp(
    `<wp:meta_key>(?:<!\\[CDATA\\[)?${key}(?:\\]\\]>)?<\\/wp:meta_key>\\s*<wp:meta_value>([\\s\\S]*?)<\\/wp:meta_value>`,
    'i',
  );
  const m = re.exec(block);
  return m ? decodeCdata(m[1]).trim() : null;
}

function uniqueSlug(title: string, used: Set<string>, fallback: string): string {
  let slug = slugify(title, fallback);
  let n = 2;
  while (used.has(slug)) {
    slug = `${slugify(title)}-${n++}`;
  }
  used.add(slug);
  return slug;
}

/**
 * Parse Pressbooks / WordPress WXR-style XML export into a chapter tree.
 * Parts become parent chapters; chapters under a part become sub-chapters.
 */
export async function parsePressbooksXml(xml: string): Promise<ParsedBook> {
  const channelTitle =
    xml.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/i)?.[1] ??
    'Untitled book';
  const bookTitle = decodeCdata(channelTitle).replace(/<[^>]+>/g, '').trim();

  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const usedSlugs = new Set<string>();

  type PartBucket = {
    title: string;
    content: string;
    menuOrder: number;
    chapters: {
      title: string;
      content: string;
      postType: string;
      menuOrder: number;
    }[];
  };

  const parts = new Map<string, PartBucket>();
  const orphanChapters: {
    title: string;
    content: string;
    postType: string;
    menuOrder: number;
  }[] = [];
  let currentPartKey: string | null = null;
  let partSeq = 0;

  for (const item of items) {
    const postType = (
      tagContent(item, 'wp:post_type') ??
      metaValue(item, '_pb_post_type') ??
      ''
    ).toLowerCase();
    const title =
      tagContent(item, 'title')?.replace(/<[^>]+>/g, '').trim() || 'Untitled';
    const content =
      tagContent(item, 'content:encoded') ??
      tagContent(item, 'description') ??
      '';
    const menuOrder = Number(tagContent(item, 'wp:menu_order') ?? '0') || 0;
    const status = (tagContent(item, 'wp:status') ?? 'publish').toLowerCase();
    if (status && status !== 'publish') continue;

    if (postType === 'part') {
      partSeq += 1;
      const key = `part-${partSeq}`;
      currentPartKey = key;
      parts.set(key, {
        title,
        content,
        menuOrder,
        chapters: [],
      });
      continue;
    }

    const isChapter =
      postType === 'chapter' ||
      postType === 'front-matter' ||
      postType === 'back-matter' ||
      (!postType && content.length > 80);

    if (!isChapter) continue;
    if (!content || content.replace(/<[^>]+>/g, '').trim().length < 40) continue;

    const row = { title, content, postType, menuOrder };
    if (currentPartKey && parts.has(currentPartKey) && postType === 'chapter') {
      parts.get(currentPartKey)!.chapters.push(row);
    } else {
      orphanChapters.push(row);
    }
  }

  const roots: ParsedChapter[] = [];

  const toChapter = async (
    title: string,
    content: string,
    partTitle: string | null,
    children?: ParsedChapter[],
  ): Promise<ParsedChapter | null> => {
    const bodies = content
      ? await chapterBodiesFromHtml(content, { titleFallback: title })
      : { markdown: `# ${title}\n`, html: `<h1>${title}</h1>` };
    const markdown =
      bodies.markdown.length >= 20 ? bodies.markdown : `# ${title}\n`;
    if (markdown.length < 20 && (!children || children.length === 0)) return null;
    return {
      title,
      slug: uniqueSlug(title, usedSlugs, `chapter-${usedSlugs.size + 1}`),
      markdown,
      html: bodies.html || null,
      partTitle,
      sourceUrl: null,
      children: children && children.length > 0 ? children : undefined,
    };
  };

  // Front/back matter (orphans that aren't regular chapters under parts) first
  const front = orphanChapters
    .filter((c) => c.postType === 'front-matter')
    .sort((a, b) => a.menuOrder - b.menuOrder);
  const back = orphanChapters
    .filter((c) => c.postType === 'back-matter')
    .sort((a, b) => a.menuOrder - b.menuOrder);
  const otherOrphans = orphanChapters
    .filter((c) => c.postType !== 'front-matter' && c.postType !== 'back-matter')
    .sort((a, b) => a.menuOrder - b.menuOrder);

  for (const c of front) {
    const ch = await toChapter(c.title, c.content, null);
    if (ch) roots.push(ch);
  }

  const partList = [...parts.values()].sort((a, b) => a.menuOrder - b.menuOrder);
  for (const part of partList) {
    const kids: ParsedChapter[] = [];
    for (const c of part.chapters.sort((a, b) => a.menuOrder - b.menuOrder)) {
      const ch = await toChapter(c.title, c.content, part.title);
      if (ch) kids.push(ch);
    }
    if (kids.length === 0) {
      const alone = await toChapter(part.title, part.content, null);
      if (alone) roots.push(alone);
      continue;
    }
    const parent = await toChapter(part.title, part.content, null, kids);
    if (parent) roots.push(parent);
  }

  for (const c of otherOrphans) {
    const ch = await toChapter(c.title, c.content, null);
    if (ch) roots.push(ch);
  }
  for (const c of back) {
    const ch = await toChapter(c.title, c.content, null);
    if (ch) roots.push(ch);
  }

  const flat = flattenParsedChapters(roots).slice(0, MAX_BOOK_CHAPTERS);
  // If we overshot via nesting, rebuild roots is hard — truncate flat by re-parsing
  // is unnecessary if we stop adding when over budget during construction.
  if (flat.length === 0) {
    throw new Error(
      'Pressbooks XML produced no chapters. Export “Pressbooks XML” from the book dashboard.',
    );
  }

  // If over budget, keep only first N flat positions by trimming children
  if (flattenParsedChapters(roots).length > MAX_BOOK_CHAPTERS) {
    return {
      title: bookTitle || 'Untitled book',
      chapters: flattenToCappedRoots(roots, MAX_BOOK_CHAPTERS),
    };
  }

  return { title: bookTitle || 'Untitled book', chapters: roots };
}

function flattenToCappedRoots(
  roots: ParsedChapter[],
  max: number,
): ParsedChapter[] {
  const out: ParsedChapter[] = [];
  let count = 0;
  for (const r of roots) {
    if (count >= max) break;
    const kids: ParsedChapter[] = [];
    count += 1; // parent
    for (const c of r.children ?? []) {
      if (count >= max) break;
      kids.push({ ...c, children: undefined });
      count += 1;
    }
    out.push({
      ...r,
      children: kids.length > 0 ? kids : undefined,
    });
  }
  return out;
}
