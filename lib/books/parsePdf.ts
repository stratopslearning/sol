import { extractTextFromUpload } from '@/lib/knowledge/extract';
import type { ParsedBook } from '@/lib/books/types';

/**
 * PDF hosted books: one synthetic chapter for TOC/RAG; student reading uses
 * pdf.js against the stored file (not HTML body).
 */
export async function parsePdf(
  buffer: Buffer,
  opts?: { fileName?: string; title?: string },
): Promise<ParsedBook> {
  const title =
    opts?.title?.trim() ||
    opts?.fileName?.replace(/\.[^.]+$/, '')?.trim() ||
    'PDF book';

  let text = '';
  try {
    text = await extractTextFromUpload({
      buffer,
      mimeType: 'application/pdf',
      fileName: opts?.fileName || 'book.pdf',
    });
  } catch {
    text = '';
  }

  const markdown =
    text.trim() ||
    `# ${title}\n\n_(PDF text could not be extracted; open the reader to view pages.)_\n`;

  return {
    title,
    chapters: [
      {
        title: 'Read book',
        slug: 'read-book',
        markdown,
        html: null,
      },
    ],
  };
}
