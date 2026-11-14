import {
  MAX_BOOK_CHAPTERS,
  MAX_CHAPTER_FETCH_BYTES,
} from '@/lib/books/constants';
import { flattenParsedChapters } from '@/lib/books/hierarchy';
import { slugify } from '@/lib/books/htmlToMarkdown';
import { chapterBodiesFromHtml } from '@/lib/books/sanitizeChapterHtml';
import type { ParsedBook, ParsedChapter } from '@/lib/books/types';
import { assertSafeMaterialUrlResolved } from '@/lib/knowledge/urlSafety';

const CHAPTER_PATH =
  /\/(chapter|front-matter|back-matter|part)\/[^/?#]+\/?$/i;

async function fetchHtml(
  url: string,
): Promise<{ status: number; html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    let current = (await assertSafeMaterialUrlResolved(url)).toString();
    let res: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      await assertSafeMaterialUrlResolved(current);
      res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SOL-Books/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    }
    if (!res) return { status: 0, html: '', finalUrl: current };
    if (!res.ok) {
      return { status: res.status, html: '', finalUrl: current };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_CHAPTER_FETCH_BYTES) {
      throw new Error('Chapter page exceeds size limit');
    }
    return { status: res.status, html: buf.toString('utf8'), finalUrl: current };
  } finally {
    clearTimeout(timer);
  }
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

type TocEntry = { href: string; title: string; depth: number };

/**
 * Collect TOC links with nesting depth from nested <ul>/<ol> lists.
 */
function collectTocEntries(html: string, baseUrl: string): TocEntry[] {
  const tocBlock =
    html.match(/id=["']toc["'][\s\S]{0,120000}/i)?.[0] ??
    html.match(/class=["'][^"']*toc[^"']*["'][\s\S]{0,120000}/i)?.[0] ??
    html;

  const entries: TocEntry[] = [];
  const seen = new Set<string>();
  let depth = 0;
  const tokenRe =
    /<\/?[uo]l\b[^>]*>|<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(tocBlock))) {
    const raw = m[0];
    const lower = raw.toLowerCase();
    if (/^<[uo]l\b/.test(lower)) {
      depth += 1;
      continue;
    }
    if (/^<\/[uo]l\b/.test(lower)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    const hrefRaw = m[1];
    if (!hrefRaw) continue;
    try {
      const abs = new URL(hrefRaw, baseUrl).toString().replace(/#.*$/, '');
      if (!sameOrigin(abs, baseUrl)) continue;
      if (!CHAPTER_PATH.test(new URL(abs).pathname)) continue;
      if (seen.has(abs)) continue;
      seen.add(abs);
      const title = (m[2] ?? '').replace(/<[^>]+>/g, '').trim() || abs;
      // depth after opening list: first level list → depth 1 → treat as 0
      entries.push({ href: abs, title, depth: Math.max(0, depth - 1) });
    } catch {
      /* ignore */
    }
  }
  return entries;
}

function pageTitle(html: string, fallback: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) return h1.replace(/<[^>]+>/g, '').trim() || fallback;
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (t) return t.replace(/<[^>]+>/g, '').trim() || fallback;
  return fallback;
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

type TocNode = TocEntry & { children: TocNode[] };

function treeFromEntries(entries: TocEntry[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const e of entries) {
    const node: TocNode = { ...e, children: [] };
    while (stack.length > e.depth) stack.pop();
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1]!.children.push(node);
    stack.push(node);
  }
  return roots;
}

/**
 * Crawl a public Pressbooks (or similar) webbook: nested TOC → chapter tree.
 */
export async function crawlWebbook(rootUrl: string): Promise<ParsedBook> {
  const root = await fetchHtml(rootUrl);
  if (root.status === 401 || root.status === 403) {
    throw new Error(
      'This webbook is private (login required). Export EPUB or Pressbooks XML from Pressbooks and upload the file instead.',
    );
  }
  if (root.status === 0 || !root.html) {
    throw new Error(
      `Could not fetch webbook (HTTP ${root.status || 'error'}). If the book is private, export EPUB/XML and upload it.`,
    );
  }

  let entries = collectTocEntries(root.html, root.finalUrl);

  if (entries.length < 2) {
    try {
      const u = new URL(root.finalUrl);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 1) {
        const home = `${u.origin}/${parts[0]}/`;
        if (home !== root.finalUrl) {
          const homePage = await fetchHtml(home);
          if (homePage.html) {
            const more = collectTocEntries(homePage.html, homePage.finalUrl);
            if (more.length > entries.length) entries = more;
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (entries.length === 0 && CHAPTER_PATH.test(new URL(root.finalUrl).pathname)) {
    entries = [
      {
        href: root.finalUrl,
        title: pageTitle(root.html, 'Chapter 1'),
        depth: 0,
      },
    ];
  }

  if (entries.length === 0) {
    throw new Error(
      'No chapter links found. Use a Pressbooks book home or table-of-contents URL, or upload an EPUB/XML export.',
    );
  }

  const bookTitle = pageTitle(root.html, 'Untitled book');
  const usedSlugs = new Set<string>();
  const cache = new Map<
    string,
    { title: string; markdown: string; html: string; finalUrl: string }
  >();

  async function fetchChapter(href: string, fallbackTitle: string) {
    const cached = cache.get(href);
    if (cached) return cached;
    const page = await fetchHtml(href);
    if (page.status === 401 || page.status === 403) {
      throw new Error(
        'A chapter URL requires login. Export EPUB or Pressbooks XML and upload instead.',
      );
    }
    if (!page.html) {
      const empty = {
        title: fallbackTitle,
        markdown: `# ${fallbackTitle}\n`,
        html: `<h1>${fallbackTitle}</h1>`,
        finalUrl: href,
      };
      cache.set(href, empty);
      return empty;
    }
    const title = pageTitle(page.html, fallbackTitle);
    const bodies = await chapterBodiesFromHtml(page.html, {
      baseUrl: page.finalUrl,
      titleFallback: title,
    });
    let markdown = bodies.markdown;
    if (markdown.length < 40) markdown = `# ${title}\n`;
    const row = {
      title,
      markdown,
      html: bodies.html,
      finalUrl: page.finalUrl,
    };
    cache.set(href, row);
    return row;
  }

  async function nodeToChapter(node: TocNode): Promise<ParsedChapter> {
    const page = await fetchChapter(node.href, node.title);
    const children: ParsedChapter[] = [];
    for (const child of node.children) {
      children.push(await nodeToChapter(child));
    }
    return {
      title: page.title || node.title,
      slug: uniqueSlug(
        page.title || node.title,
        usedSlugs,
        `chapter-${usedSlugs.size + 1}`,
      ),
      markdown: page.markdown,
      html: page.html || null,
      partTitle: null,
      sourceUrl: page.finalUrl,
      children: children.length > 0 ? children : undefined,
    };
  }

  const tree = treeFromEntries(entries.slice(0, MAX_BOOK_CHAPTERS));
  const chapters: ParsedChapter[] = [];
  for (const n of tree) {
    if (flattenParsedChapters(chapters).length >= MAX_BOOK_CHAPTERS) break;
    chapters.push(await nodeToChapter(n));
  }

  if (flattenParsedChapters(chapters).length === 0) {
    throw new Error('Webbook crawl found no readable chapter content');
  }

  return { title: bookTitle, chapters };
}
