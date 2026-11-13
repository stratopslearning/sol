import { describe, expect, it } from 'vitest';

import { htmlToMarkdown, slugify } from '@/lib/books/htmlToMarkdown';
import { parsePressbooksXml } from '@/lib/books/parsePressbooksXml';

describe('htmlToMarkdown', () => {
  it('converts headings and paragraphs', () => {
    const md = htmlToMarkdown(
      '<article><h1>Hello</h1><p>World <strong>bold</strong></p></article>',
    );
    expect(md).toContain('# Hello');
    expect(md).toContain('World');
  });

  it('slugifies titles', () => {
    expect(slugify('Supply Chain 101!')).toBe('supply-chain-101');
  });

  it('does not leave leading tabs that become markdown code blocks', () => {
    const md = htmlToMarkdown(
      '<article><p>\t\t\tEvery company is part of a supply chain.</p><p>Next paragraph.</p></article>',
    );
    expect(md).toContain('Every company is part of a supply chain.');
    expect(md).not.toMatch(/^\t/m);
    expect(md).toContain('Next paragraph.');
  });
});

describe('parsePressbooksXml', () => {
  it('extracts chapter items from WXR-like XML', async () => {
    const xml = `<?xml version="1.0"?>
<rss><channel>
<title>Demo Book</title>
<item>
  <title>Intro</title>
  <wp:post_type>front-matter</wp:post_type>
  <wp:status>publish</wp:status>
  <wp:menu_order>0</wp:menu_order>
  <content:encoded><![CDATA[<h1>Intro</h1><p>Welcome to the book with enough text for parsing.</p>]]></content:encoded>
</item>
<item>
  <title>Chapter One</title>
  <wp:post_type>chapter</wp:post_type>
  <wp:status>publish</wp:status>
  <wp:menu_order>1</wp:menu_order>
  <content:encoded><![CDATA[<h1>Chapter One</h1><p>Body of chapter one with plenty of words here.</p>]]></content:encoded>
</item>
</channel></rss>`;
    const book = await parsePressbooksXml(xml);
    expect(book.title).toBe('Demo Book');
    expect(book.chapters.length).toBe(2);
    expect(book.chapters[0]!.title).toBe('Intro');
    // Leading H1 matching the chapter title is stripped from bodies;
    // body prose remains.
    expect(book.chapters[1]!.markdown).toContain('Body of chapter one');
    expect(book.chapters[1]!.html).toContain('Body of chapter one');
  });
});
