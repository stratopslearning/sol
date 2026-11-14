import { DocsMarkdown } from '@/components/docs/DocsMarkdown';

/**
 * EPUB/XHTML → markdown often keeps leading tabs; CommonMark treats those
 * as code blocks (gray mono boxes). Also strip leaked <title> / TOC lines.
 */
function normalizeMarkdownFallback(
  markdown: string,
  chapterTitle?: string | null,
): string {
  let md = markdown.replace(/^[ \t]+/gm, '');

  // Drop leading "Title -- Book Name" lines (leaked <title>)
  md = md.replace(/^[^\n]+(?:\s+[–—-]+\s+)[^\n]+\n+/, '');

  // Drop leading "# Title" / "- # Title" / bullet title duplicates
  md = md.replace(/^(?:[-*]\s*)?#\s+.+\n+/, '');
  if (chapterTitle?.trim()) {
    const esc = chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    md = md.replace(new RegExp(`^(?:[-*]\\s*)?${esc}\\s*\\n+`, 'i'), '');
  }

  return md.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Native in-app chapter body (not an iframe). Prefers sanitized HTML;
 * falls back to markdown for chapters imported before HTML storage.
 */
export function BookChapterBody({
  html,
  markdown,
  chapterTitle,
}: {
  html?: string | null;
  markdown: string;
  /** Used to strip duplicate title lines from the markdown fallback. */
  chapterTitle?: string | null;
}) {
  if (html?.trim()) {
    return (
      <div
        className="book-prose"
        // Sanitized at ingest (sanitize-html allowlist).
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <div className="book-prose">
      <DocsMarkdown
        content={normalizeMarkdownFallback(markdown, chapterTitle)}
      />
    </div>
  );
}
