import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';

import { extractMainHtml, htmlToMarkdown } from '@/lib/books/htmlToMarkdown';
import { resolveYoutubeEmbedByTitle } from '@/lib/books/resolveYoutubeByTitle';

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'div',
  'span',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'blockquote',
  'pre',
  'code',
  'em',
  'strong',
  'i',
  'b',
  'u',
  's',
  'sup',
  'sub',
  'abbr',
  'cite',
  'q',
  'dl',
  'dt',
  'dd',
  'iframe',
  'section',
  'aside',
  'header',
];

const IFRAME_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
]);

function resolveUrl(base: string | null | undefined, href: string): string {
  const raw = href.trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('data:')) {
    return raw;
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) return raw;
  if (!base) return raw;
  try {
    return new URL(raw, base).toString();
  } catch {
    return raw;
  }
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function youtubeEmbedSrc(href: string): string | null {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const id =
        u.searchParams.get('v') ||
        u.pathname.match(/\/embed\/([^/?#]+)/)?.[1] ||
        u.pathname.match(/\/shorts\/([^/?#]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Pressbooks EPUB strips iframes and leaves “excluded interactive elements”
 * stubs (or bare youtube.com/watch links). Revive what we can.
 */
export function reviveMediaEmbeds(html: string): string {
  if (!html.trim()) return html;
  const $ = cheerio.load(html, null, false);

  // Bare YouTube links → iframes
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const embed = youtubeEmbedSrc(href);
    if (!embed) return;
    const title = ($(el).attr('title') || $(el).text() || 'Video').trim();
    const iframe = `<iframe src="${escapeAttr(embed)}" title="${escapeAttr(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`;
    const $p = $(el).parent('p');
    if ($p.length && $p.children().length === 1 && !$p.text().replace($(el).text(), '').trim()) {
      $p.replaceWith(iframe);
    } else {
      $(el).replaceWith(iframe);
    }
  });

  // EPUB oembed stubs → placeholder card (title resolved to YouTube async later)
  $('.interactive-content--oembed, .interactive-content').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a[href]').first();
    if (!$a.length) return;
    const href = $a.attr('href') ?? '';
    const embed = youtubeEmbedSrc(href);
    const title = ($a.attr('title') || $a.text() || 'Video').trim();
    if (embed) {
      $el.replaceWith(
        `<iframe src="${escapeAttr(embed)}" title="${escapeAttr(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`,
      );
      return;
    }
    $el.replaceWith(
      `<figure class="book-media-card" data-video-title="${escapeAttr(title)}"><p class="book-media-card__label">Video</p><p class="book-media-card__title">${escapeAttr(title)}</p></figure>`,
    );
  });

  return $.html().trim();
}

const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

/**
 * Turn Pressbooks oembed stub cards into real YouTube iframes by searching
 * for the video title (EPUB never includes the watch URL).
 */
export async function resolveMediaCardsToYoutubeEmbeds(
  html: string,
): Promise<string> {
  if (!html.trim() || !html.includes('book-media-card')) return html;
  const $ = cheerio.load(html, null, false);
  const cards = $('.book-media-card').toArray();
  if (cards.length === 0) return html;

  // Resolve sequentially with a small gap to avoid hammering YouTube search.
  for (const el of cards) {
    const $el = $(el);
    const title = (
      $el.attr('data-video-title') ||
      $el.find('.book-media-card__title').first().text() ||
      ''
    ).trim();
    if (!title) continue;
    const embed = await resolveYoutubeEmbedByTitle(title);
    if (!embed) {
      // Leave a YouTube search link — never Pressbooks (often Cloudflare-gated).
      const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;
      $el.find('.book-media-card__action').remove();
      $el.append(
        `<p class="book-media-card__action"><a href="${escapeAttr(search)}" rel="noopener noreferrer" target="_blank">Watch on YouTube</a></p>`,
      );
      continue;
    }
    $el.replaceWith(
      `<iframe src="${escapeAttr(embed)}" title="${escapeAttr(title)}" allow="${IFRAME_ALLOW}" allowfullscreen loading="lazy"></iframe>`,
    );
  }

  return $.html().trim();
}

/** Drop the first h1/h2 that duplicates the chapter title (reader already shows it). */
export function stripLeadingTitleHeading(
  html: string,
  chapterTitle?: string | null,
): string {
  if (!html.trim() || !chapterTitle?.trim()) return html;
  const want = normalizeTitle(chapterTitle);
  if (!want) return html;

  const $ = cheerio.load(html, null, false);
  const $heading = $('h1, h2').first();
  if ($heading.length) {
    const text = normalizeTitle($heading.text());
    if (
      text === want ||
      text.startsWith(`${want} `) ||
      want.startsWith(text)
    ) {
      $heading.remove();
    }
  }
  // Empty chapter-title wrappers left behind by Pressbooks EPUB
  $('.chapter-title-wrap').each((_, el) => {
    if (!$(el).text().trim()) $(el).remove();
  });
  return $.html().trim();
}

/**
 * Extract main content, rewrite relative links/images against `baseUrl`,
 * and strip scripts/styles/unsafe tags for in-app rendering (not an iframe).
 */
export function sanitizeChapterHtml(
  rawHtml: string,
  opts?: { baseUrl?: string | null; chapterTitle?: string | null },
): string {
  const main = extractMainHtml(rawHtml);
  const base = opts?.baseUrl ?? null;

  const cleaned = sanitizeHtml(main, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope'],
      iframe: [
        'src',
        'title',
        'allow',
        'allowfullscreen',
        'frameborder',
        'loading',
        'width',
        'height',
        'referrerpolicy',
      ],
      '*': ['id', 'class'],
    },
    allowedIframeHostnames: [...IFRAME_HOSTS],
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowProtocolRelative: true,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href
          ? resolveUrl(base, attribs.href)
          : undefined;
        const external =
          href &&
          (href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('//'));
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(href ? { href } : {}),
            ...(external
              ? { rel: 'noopener noreferrer', target: '_blank' }
              : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        const src = attribs.src
          ? resolveUrl(base, attribs.src)
          : undefined;
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(src ? { src } : {}),
            loading: 'lazy',
          },
        };
      },
      iframe: (tagName, attribs) => {
        const src = attribs.src
          ? resolveUrl(base, attribs.src)
          : undefined;
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(src ? { src } : {}),
            loading: attribs.loading || 'lazy',
            allowfullscreen: 'true',
          },
        };
      },
    },
  });

  const withMedia = reviveMediaEmbeds(cleaned);
  const deduped = stripLeadingTitleHeading(withMedia, opts?.chapterTitle);
  return deduped.replace(/\n{3,}/g, '\n\n').trim();
}

/** Sanitized HTML for reading + markdown for RAG from the same fragment. */
export async function chapterBodiesFromHtml(
  rawHtml: string,
  opts?: { baseUrl?: string | null; titleFallback?: string },
): Promise<{ markdown: string; html: string }> {
  let html = sanitizeChapterHtml(rawHtml, {
    baseUrl: opts?.baseUrl,
    chapterTitle: opts?.titleFallback,
  });
  html = await resolveMediaCardsToYoutubeEmbeds(html);
  let markdown = htmlToMarkdown(html || rawHtml);
  if (markdown.length < 20 && opts?.titleFallback) {
    markdown = `# ${opts.titleFallback}\n`;
  }
  return { markdown, html: html || '' };
}

const MAX_DATA_URI_BYTES = 400_000;

/**
 * Rewrite relative `<img src>` in EPUB XHTML to data URIs from the zip.
 * Oversized assets are dropped (alt kept via sanitize later).
 */
export function inlineEpubImages(
  xhtml: string,
  resolveAsset: (path: string) => { bytes: Buffer; mime: string } | null,
  chapterPath: string,
): string {
  return xhtml.replace(
    /<img\b([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
    (full, pre, src, post) => {
      const trimmed = String(src).trim();
      if (
        !trimmed ||
        trimmed.startsWith('data:') ||
        /^https?:\/\//i.test(trimmed)
      ) {
        return full;
      }
      const { path } = (() => {
        const noHash = trimmed.split('#')[0] ?? trimmed;
        const baseDir = chapterPath.includes('/')
          ? chapterPath.slice(0, chapterPath.lastIndexOf('/') + 1)
          : '';
        const parts = (baseDir + noHash).split('/');
        const out: string[] = [];
        for (const p of parts) {
          if (!p || p === '.') continue;
          if (p === '..') out.pop();
          else out.push(p);
        }
        return { path: out.join('/') };
      })();
      const asset = resolveAsset(path);
      if (!asset || asset.bytes.byteLength > MAX_DATA_URI_BYTES) {
        return `<img${pre}${post}>`;
      }
      const b64 = asset.bytes.toString('base64');
      const dataSrc = `data:${asset.mime};base64,${b64}`;
      return `<img${pre}src="${dataSrc}"${post}>`;
    },
  );
}
