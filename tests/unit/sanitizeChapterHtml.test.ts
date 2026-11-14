import { describe, expect, it, vi } from 'vitest';

import { extractMainHtml } from '@/lib/books/htmlToMarkdown';
import {
  chapterBodiesFromHtml,
  resolveMediaCardsToYoutubeEmbeds,
  sanitizeChapterHtml,
  stripLeadingTitleHeading,
} from '@/lib/books/sanitizeChapterHtml';
import * as youtubeResolve from '@/lib/books/resolveYoutubeByTitle';

describe('extractMainHtml', () => {
  it('keeps the full nested entry-content subtree (not first </div>)', () => {
    const html = `
      <div class="entry-content">
        <div class="inner"><p>first block</p></div>
        <p>In the wake of the COVID-19 pandemic, the importance of robust supply chain.</p>
        <p>Consider the case of Kellogg's.</p>
      </div>`;
    const main = extractMainHtml(html);
    expect(main).toContain('first block');
    expect(main).toContain('COVID-19');
    expect(main).toContain("Kellogg's");
  });

  it('strips page chrome but keeps textbox headers', () => {
    const html = `
      <html><head><title>1.1 Introduction -- Book Title</title></head>
      <body>
        <div id="toc"><ul><li>1.1 Introduction</li></ul></div>
        <main>
          <div class="entry-content">
            <div class="textbox">
              <header class="textbox__header"><h2>Pause and Think</h2></header>
              <p>What role did supply chains play?</p>
            </div>
            <p>Body prose after the callout.</p>
          </div>
        </main>
      </body></html>`;
    const main = extractMainHtml(html);
    expect(main).not.toContain('1.1 Introduction -- Book Title');
    expect(main).not.toMatch(/id="toc"/);
    expect(main).toContain('Pause and Think');
    expect(main).toContain('Body prose after the callout');
  });
});

describe('sanitizeChapterHtml', () => {
  it('keeps YouTube iframes and strips unknown hosts', () => {
    const html = `
      <main>
        <p>Intro</p>
        <iframe src="https://www.youtube.com/embed/abc123" title="vid"></iframe>
        <iframe src="https://evil.example/embed"></iframe>
        <p>After</p>
      </main>`;
    const out = sanitizeChapterHtml(html);
    expect(out).toContain('youtube.com/embed/abc123');
    expect(out).not.toContain('evil.example');
    expect(out).toContain('Intro');
    expect(out).toContain('After');
  });

  it('strips leading title heading that duplicates chapter title', () => {
    const html = `<h1>1.1 Introduction</h1><p>In the wake of the pandemic.</p>`;
    const out = sanitizeChapterHtml(html, {
      chapterTitle: '1.1 Introduction',
    });
    expect(out).not.toMatch(/<h1[^>]*>\s*1\.1 Introduction\s*<\/h1>/i);
    expect(out).toContain('wake of the pandemic');
  });

  it('chapterBodiesFromHtml returns html with video and full prose', async () => {
    const raw = `
      <html><head><title>1.1 Introduction -- Supply Chain</title></head>
      <body>
        <nav id="toc"><ul><li>1.1 Introduction</li></ul></nav>
        <article>
          <div class="entry-content">
            <h1>1.1 Introduction</h1>
            <p>In the wake of the COVID-19 pandemic, the importance of robust supply chain management has been brought into sharp focus.</p>
            <iframe src="https://www.youtube.com/embed/xyz" allowfullscreen></iframe>
            <div class="textbox">
              <header class="textbox__header"><p>Pause and Think</p></header>
              <p>What role did supply chain management play?</p>
            </div>
            <p>Consider the case of Kellogg's.</p>
          </div>
        </article>
      </body></html>`;
    const { html } = await chapterBodiesFromHtml(raw, {
      titleFallback: '1.1 Introduction',
    });
    expect(html).toContain('COVID-19');
    expect(html).toContain('youtube.com/embed/xyz');
    expect(html).toContain('Pause and Think');
    expect(html).toContain("Kellogg's");
    // Leading duplicate title removed; document title / TOC not leaked
    expect(html).not.toContain('1.1 Introduction -- Supply Chain');
    expect(html.match(/1\.1 Introduction/g)?.length ?? 0).toBeLessThanOrEqual(
      1,
    );
  });
});

describe('reviveMediaEmbeds', () => {
  it('turns bare YouTube links into iframes', () => {
    const html = sanitizeChapterHtml(
      '<main><p><a href="https://www.youtube.com/watch?v=C5Fl-1AOqOU">https://www.youtube.com/watch?v=C5Fl-1AOqOU</a></p></main>',
    );
    expect(html).toContain('youtube.com/embed/C5Fl-1AOqOU');
    expect(html).toContain('<iframe');
  });

  it('replaces Pressbooks EPUB oembed stubs with a titled media card', () => {
    const html = sanitizeChapterHtml(`
      <main>
        <div class="textbox interactive-content interactive-content--oembed">
          <p>One or more interactive elements has been excluded from this version of the text. You can view them online here:
          <a href="https://pressbooks.pub/supplychainmanagement3005/?p=35#oembed-1"
             title="Supply Chain Management In 6 Minutes | Simplilearn">https://pressbooks.pub/…</a></p>
        </div>
      </main>`);
    expect(html).toContain('book-media-card');
    expect(html).toContain('data-video-title');
    expect(html).toContain('Supply Chain Management In 6 Minutes');
    expect(html).not.toContain('excluded from this version');
  });

  it('resolves media cards to YouTube embeds by title', async () => {
    const spy = vi
      .spyOn(youtubeResolve, 'resolveYoutubeEmbedByTitle')
      .mockResolvedValue('https://www.youtube.com/embed/Lpp9bHtPAN0');
    const stub = sanitizeChapterHtml(`
      <main>
        <div class="interactive-content--oembed">
          <a href="https://pressbooks.pub/x/?p=35#oembed-1"
             title="Supply Chain Management In 6 Minutes | Simplilearn">x</a>
        </div>
      </main>`);
    const html = await resolveMediaCardsToYoutubeEmbeds(stub);
    expect(html).toContain('youtube.com/embed/Lpp9bHtPAN0');
    expect(html).not.toContain('pressbooks.pub');
    expect(html).not.toContain('book-media-card');
    spy.mockRestore();
  });
});

describe('stripLeadingTitleHeading', () => {
  it('removes only the first matching heading', () => {
    const html =
      '<h1>Intro</h1><p>Body</p><h2>Intro</h2><p>More</p>';
    const out = stripLeadingTitleHeading(html, 'Intro');
    expect(out.startsWith('<p>Body</p>')).toBe(true);
    expect(out).toContain('<h2>Intro</h2>');
  });
});
