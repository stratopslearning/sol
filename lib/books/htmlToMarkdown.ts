/**
 * HTML → markdown for RAG / outline context.
 * Prefer sanitizeChapterHtml for the student reader body.
 */

import * as cheerio from 'cheerio';

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

/**
 * Prefer the full main content subtree (not regex cut at first </div>).
 * Strips page chrome; keeps Pressbooks textbox <header> elements.
 */
export function extractMainHtml(html: string): string {
  const $ = cheerio.load(html);

  $('script, style, noscript, template').remove();
  $('head').remove();

  const selectors = [
    'main',
    '[role="main"]',
    'article',
    '.entry-content',
    '#content',
  ];

  let $scope = $('body');
  for (const sel of selectors) {
    const found = $(sel).first();
    if (found.length) {
      $scope = found as typeof $scope;
      break;
    }
  }

  if (!$scope.length) {
    // Fragment without html/body — clean and return as-is.
    return $.root().html()?.trim() ?? html.trim();
  }

  // Page chrome only — do NOT strip every <header> (textbox titles use header).
  $scope
    .find(
      [
        'nav',
        '#toc',
        '.toc',
        '#wpadminbar',
        '.skip-link',
        '.skiplink',
        '.screen-reader-text',
        '.pb-searchform',
        'header.header',
        'header.site-header',
        'footer.footer',
        'footer.site-footer',
        '.nav-reading',
        '.nav-reading--previous',
        '.nav-reading--next',
        '#secondary',
        '.widget-area',
      ].join(', '),
    )
    .remove();

  // Comments
  $scope.find('*').contents().each((_, node) => {
    if (node.type === 'comment') {
      $(node).remove();
    }
  });

  const out = $.html($scope);
  return (out ?? '').trim();
}

function cellText(html: string): string {
  return stripTags(html).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
}

export function htmlToMarkdown(html: string): string {
  let body = extractMainHtml(html);

  body = body.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const text = stripTags(inner);
    if (!text) return '';
    return `\n\n${'#'.repeat(Number(level))} ${text}\n\n`;
  });

  body = body.replace(
    /<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _t, inner) => `**${stripTags(inner)}**`,
  );
  body = body.replace(
    /<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _t, inner) => `*${stripTags(inner)}*`,
  );
  body = body.replace(
    /<code[^>]*>([\s\S]*?)<\/code>/gi,
    (_, inner) => `\`${stripTags(inner)}\``,
  );
  body = body.replace(
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, inner) => `\n\n\`\`\`\n${stripTags(inner)}\n\`\`\`\n\n`,
  );

  body = body.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner) => {
    const rows: string[][] = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr: RegExpExecArray | null;
    while ((tr = trRe.exec(tableInner))) {
      const cells: string[] = [];
      const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
      let cell: RegExpExecArray | null;
      while ((cell = cellRe.exec(tr[1]!))) {
        cells.push(cellText(cell[2]!));
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length === 0) return '\n\n';
    const width = Math.max(...rows.map((r) => r.length));
    const pad = (r: string[]) =>
      Array.from({ length: width }, (_, i) => r[i] ?? '');
    const header = pad(rows[0]!);
    const bodyRows = rows.slice(1).map(pad);
    const lines = [
      `| ${header.join(' | ')} |`,
      `| ${header.map(() => '---').join(' | ')} |`,
      ...bodyRows.map((r) => `| ${r.join(' | ')} |`),
    ];
    return `\n\n${lines.join('\n')}\n\n`;
  });

  body = body.replace(
    /<img[^>]+alt=["']([^"']*)["'][^>]*>/gi,
    (_, alt) => (alt ? ` ![${alt}](image) ` : ' '),
  );
  body = body.replace(/<img[^>]*>/gi, ' ');

  body = body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => {
    const text = stripTags(inner);
    return text ? `\n- ${text}` : '';
  });
  body = body.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  body = body.replace(
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const text = stripTags(inner) || href;
      return `[${text}](${href})`;
    },
  );

  body = body.replace(/<(?:p|div|br\s*\/?)[^>]*>/gi, '\n\n');
  body = body.replace(/<\/(?:p|div)>/gi, '\n\n');
  body = body.replace(/<[^>]+>/g, ' ');
  body = decodeEntities(body);

  return body
    // EPUB/XHTML often indents text nodes; leading tabs/spaces become
    // CommonMark code blocks in the markdown fallback reader.
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function slugify(title: string, fallback = 'chapter'): string {
  const s = title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || fallback;
}
