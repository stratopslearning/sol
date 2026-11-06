/** Max book upload size (50 MB) — larger than Knowledge materials. */
export const MAX_BOOK_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Cap chapters per import (Pressbooks crawl or EPUB spine). */
export const MAX_BOOK_CHAPTERS = 200;

/** Max bytes for a single webbook chapter HTML response. */
export const MAX_CHAPTER_FETCH_BYTES = 5 * 1024 * 1024;

export const BOOK_EPUB_MIME = new Set([
  'application/epub+zip',
  'application/zip',
  'application/x-zip-compressed',
]);

export const BOOK_XML_MIME = new Set([
  'application/xml',
  'text/xml',
  'application/xhtml+xml',
]);
