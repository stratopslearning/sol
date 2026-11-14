import JSZip from 'jszip';

import { MAX_BOOK_CHAPTERS } from '@/lib/books/constants';
import { flattenParsedChapters } from '@/lib/books/hierarchy';
import { slugify } from '@/lib/books/htmlToMarkdown';
import {
  chapterBodiesFromHtml,
  inlineEpubImages,
} from '@/lib/books/sanitizeChapterHtml';
import type { ParsedBook, ParsedChapter } from '@/lib/books/types';

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag);
  return m?.[1] ?? null;
}

function resolveHref(base: string, href: string): string {
  if (!href) return base;
  if (href.startsWith('/')) return href.slice(1);
  const baseDir = base.includes('/')
    ? base.slice(0, base.lastIndexOf('/') + 1)
    : '';
  const parts = (baseDir + href).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

function stripHash(href: string): { path: string; hash: string | null } {
  const i = href.indexOf('#');
  if (i < 0) return { path: href, hash: null };
  return { path: href.slice(0, i), hash: href.slice(i + 1) || null };
}

function extractById(xhtml: string, id: string): string | null {
  if (!id) return null;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Prefer a heading/section with this id through the next sibling heading.
  const re = new RegExp(
    `(<(?:h[1-6]|section|div|article)\\b[^>]*\\bid=["']${escaped}["'][^>]*>[\\s\\S]*?)(?=<(?:h[1-6])\\b|$)`,
    'i',
  );
  const m = re.exec(xhtml);
  return m?.[1] ?? null;
}

type NavNode = { title: string; href: string | null; children: NavNode[] };

/** Parse nested <ol>/<li>/<a> from EPUB3 nav or similar XHTML TOC. */
function parseNavOl(html: string): NavNode[] {
  type Frame = { nodes: NavNode[]; current: NavNode | null };
  const root: Frame = { nodes: [], current: null };
  const stack: Frame[] = [root];
  const tokenRe =
    /<\/?ol\b[^>]*>|<\/?li\b[^>]*>|<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html))) {
    const raw = m[0];
    const lower = raw.toLowerCase();
    if (lower.startsWith('<ol')) {
      const frame = stack[stack.length - 1]!;
      if (frame.current) {
        stack.push({ nodes: frame.current.children, current: null });
      } else {
        stack.push({ nodes: frame.nodes, current: null });
      }
      continue;
    }
    if (lower.startsWith('</ol')) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (lower.startsWith('<li') && !lower.startsWith('</li')) {
      const frame = stack[stack.length - 1]!;
      const node: NavNode = { title: '', href: null, children: [] };
      frame.nodes.push(node);
      frame.current = node;
      continue;
    }
    if (lower.startsWith('</li')) {
      const frame = stack[stack.length - 1]!;
      frame.current = null;
      continue;
    }
    if (lower.startsWith('<a')) {
      const frame = stack[stack.length - 1]!;
      const href = attr(m[1] ?? '', 'href');
      const title = (m[2] ?? '').replace(/<[^>]+>/g, '').trim();
      if (!frame.current) {
        const node: NavNode = {
          title: title || 'Untitled',
          href,
          children: [],
        };
        frame.nodes.push(node);
        frame.current = node;
      } else {
        if (title) frame.current.title = title;
        if (href) frame.current.href = href;
      }
    }
  }
  return root.nodes;
}

async function loadNavNodes(
  zip: JSZip,
  opfXml: string,
  opfDir: string,
): Promise<{ nodes: NavNode[]; navPath: string } | null> {
  // EPUB3: item with properties containing "nav"
  const itemRe = /<item\b[^>]*>/gi;
  let itemM: RegExpExecArray | null;
  let navHref: string | null = null;
  while ((itemM = itemRe.exec(opfXml))) {
    const tag = itemM[0];
    const props = attr(tag, 'properties') ?? '';
    if (/\bnav\b/i.test(props)) {
      const href = attr(tag, 'href');
      if (href) {
        navHref = resolveHref(opfDir, href);
        break;
      }
    }
  }
  if (!navHref) {
    for (const guess of ['toc.xhtml', 'nav.xhtml', 'TOC.xhtml', 'Nav.xhtml']) {
      const p = resolveHref(opfDir, guess);
      if (zip.file(p)) {
        navHref = p;
        break;
      }
    }
  }
  if (!navHref) return null;
  const navHtml = await zip.file(navHref)?.async('string');
  if (!navHtml) return null;
  const tocChunk =
    navHtml.match(
      /<(?:nav)\b[^>]*(?:epub:type|role)=["'][^"']*toc[^"']*["'][^>]*>[\s\S]*?<\/nav>/i,
    )?.[0] ?? navHtml;
  const nodes = parseNavOl(tocChunk);
  return nodes.length > 0 ? { nodes, navPath: navHref } : null;
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
 * Parse EPUB 2/3: prefer nested nav TOC (chapter → sub-chapter); else flat spine.
 */
export async function parseEpub(buffer: Buffer): Promise<ParsedBook> {
  const zip = await JSZip.loadAsync(buffer);
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Invalid EPUB: missing META-INF/container.xml');

  const rootfile =
    attr(containerXml.match(/<rootfile\b[^>]*>/i)?.[0] ?? '', 'full-path') ??
    null;
  if (!rootfile) throw new Error('Invalid EPUB: no rootfile in container');

  const opfXml = await zip.file(rootfile)?.async('string');
  if (!opfXml) throw new Error(`Invalid EPUB: missing OPF ${rootfile}`);

  const opfDir = rootfile.includes('/')
    ? rootfile.slice(0, rootfile.lastIndexOf('/') + 1)
    : '';

  const titleMatch =
    opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i) ??
    opfXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const bookTitle = (titleMatch?.[1] ?? 'Untitled book')
    .replace(/<[^>]+>/g, '')
    .trim();

  const manifest = new Map<string, { href: string; mediaType: string }>();
  const itemRe = /<item\b[^>]*>/gi;
  let itemM: RegExpExecArray | null;
  while ((itemM = itemRe.exec(opfXml))) {
    const tag = itemM[0];
    const id = attr(tag, 'id');
    const href = attr(tag, 'href');
    const mediaType = attr(tag, 'media-type') ?? '';
    if (id && href) {
      manifest.set(id, { href: resolveHref(opfDir, href), mediaType });
    }
  }

  const pathToXhtml = new Map<string, string>();
  async function loadXhtml(path: string): Promise<string | null> {
    if (pathToXhtml.has(path)) return pathToXhtml.get(path)!;
    const xhtml = await zip.file(path)?.async('string');
    if (xhtml) pathToXhtml.set(path, xhtml);
    return xhtml ?? null;
  }

  function mimeForPath(path: string): string {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }

  function resolveAsset(path: string): { bytes: Buffer; mime: string } | null {
    const file = zip.file(path);
    if (!file) return null;
    // Sync path not available; callers must use async wrapper below.
    return null;
  }

  const assetCache = new Map<string, { bytes: Buffer; mime: string } | null>();
  async function loadAsset(
    path: string,
  ): Promise<{ bytes: Buffer; mime: string } | null> {
    if (assetCache.has(path)) return assetCache.get(path)!;
    const file = zip.file(path);
    if (!file) {
      assetCache.set(path, null);
      return null;
    }
    const bytes = Buffer.from(await file.async('uint8array'));
    const row = { bytes, mime: mimeForPath(path) };
    assetCache.set(path, row);
    return row;
  }

  async function bodiesFromXhtml(
    xhtml: string,
    chapterPath: string,
    title: string,
  ): Promise<{ markdown: string; html: string }> {
    // Prefetch image assets referenced in this fragment, then inline sync.
    const srcs = [
      ...xhtml.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi),
    ].map((m) => m[1]!);
    for (const src of srcs) {
      if (!src || src.startsWith('data:') || /^https?:\/\//i.test(src)) continue;
      const noHash = src.split('#')[0] ?? src;
      const resolved = resolveHref(
        chapterPath.includes('/')
          ? chapterPath.slice(0, chapterPath.lastIndexOf('/') + 1)
          : '',
        noHash,
      );
      await loadAsset(resolved);
    }
    const withImages = inlineEpubImages(
      xhtml,
      (p) => assetCache.get(p) ?? resolveAsset(p),
      chapterPath,
    );
    return await chapterBodiesFromHtml(withImages, { titleFallback: title });
  }

  const usedSlugs = new Set<string>();
  let chapterBudget = MAX_BOOK_CHAPTERS;

  async function nodeToChapter(
    node: NavNode,
    navBase: string,
  ): Promise<ParsedChapter | null> {
    if (chapterBudget <= 0) return null;
    const title = node.title.trim() || 'Untitled';
    let markdown = `# ${title}\n`;
    let html: string | null = null;
    let sourceUrl: string | null = null;

    if (node.href) {
      const resolved = resolveHref(navBase, node.href);
      const { path, hash } = stripHash(resolved);
      const xhtml = await loadXhtml(path);
      if (xhtml) {
        sourceUrl = path;
        const frag = hash ? extractById(xhtml, hash) ?? xhtml : xhtml;
        const bodies = await bodiesFromXhtml(frag, path, title);
        markdown = bodies.markdown;
        html = bodies.html || null;
        if (markdown.length < 20) markdown = `# ${title}\n`;
      }
    }

    chapterBudget -= 1;
    const children: ParsedChapter[] = [];
    for (const child of node.children) {
      if (chapterBudget <= 0) break;
      const c = await nodeToChapter(child, navBase);
      if (c) children.push(c);
    }

    // Skip empty leaves with no children
    if (children.length === 0 && markdown.replace(/^#.*$/m, '').trim().length < 20) {
      // Keep as structural parent only if it somehow has children — already empty
      if (!node.href) return null;
    }

    return {
      title,
      slug: uniqueSlug(title, usedSlugs, `chapter-${usedSlugs.size + 1}`),
      markdown,
      html,
      partTitle: null,
      sourceUrl,
      children: children.length > 0 ? children : undefined,
    };
  }

  const nav = await loadNavNodes(zip, opfXml, opfDir);
  if (nav && nav.nodes.length > 0) {
    const navDir = nav.navPath.includes('/')
      ? nav.navPath.slice(0, nav.navPath.lastIndexOf('/') + 1)
      : opfDir;

    const chapters: ParsedChapter[] = [];
    for (const n of nav.nodes) {
      if (chapterBudget <= 0) break;
      const ch = await nodeToChapter(n, navDir);
      if (ch) chapters.push(ch);
    }
    if (flattenParsedChapters(chapters).length > 0) {
      return { title: bookTitle, chapters };
    }
  }

  // Fallback: flat spine
  const spineIds: string[] = [];
  const spineRe = /<itemref\b[^>]*>/gi;
  let spineM: RegExpExecArray | null;
  while ((spineM = spineRe.exec(opfXml))) {
    const idref = attr(spineM[0], 'idref');
    if (idref) spineIds.push(idref);
  }
  if (spineIds.length === 0) {
    throw new Error('Invalid EPUB: empty spine');
  }

  const chapters: ParsedChapter[] = [];
  for (const idref of spineIds) {
    if (chapters.length >= MAX_BOOK_CHAPTERS) break;
    const entry = manifest.get(idref);
    if (!entry) continue;
    if (
      !entry.mediaType.includes('html') &&
      !entry.href.endsWith('.xhtml') &&
      !entry.href.endsWith('.html') &&
      !entry.href.endsWith('.htm')
    ) {
      continue;
    }
    const xhtml = await loadXhtml(entry.href);
    if (!xhtml) continue;

    const h1 =
      xhtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
      xhtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
      `Chapter ${chapters.length + 1}`;
    const title =
      h1.replace(/<[^>]+>/g, '').trim() || `Chapter ${chapters.length + 1}`;
    const bodies = await bodiesFromXhtml(xhtml, entry.href, title);
    if (bodies.markdown.length < 40) continue;

    chapters.push({
      title,
      slug: uniqueSlug(title, usedSlugs, `chapter-${chapters.length + 1}`),
      markdown: bodies.markdown,
      html: bodies.html || null,
      partTitle: null,
      sourceUrl: entry.href,
    });
  }

  if (chapters.length === 0) {
    throw new Error('EPUB produced no readable chapters');
  }

  return { title: bookTitle, chapters };
}
