export type ParsedChapter = {
  title: string;
  slug: string;
  markdown: string;
  /** Sanitized HTML for reading; null/omit falls back to markdown. */
  html?: string | null;
  partTitle?: string | null;
  sourceUrl?: string | null;
  /** Nested TOC children (flattened on persist). */
  children?: ParsedChapter[];
};

export type ParsedBook = {
  title: string;
  chapters: ParsedChapter[];
};

export type BookSummary = {
  id: string;
  courseId: string;
  title: string;
  sourceKind: 'WEBBOOK_URL' | 'EPUB' | 'PRESSBOOKS_XML';
  sourceUrl: string | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage: string | null;
  isReleased: boolean;
  chapterCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Light TOC row for professor materials UI (no markdown body). */
export type BookChapterTocItem = {
  id: string;
  position: number;
  title: string;
  partTitle: string | null;
  parentId: string | null;
  level: number;
};

export type BookWithChapters = BookSummary & {
  chapters: BookChapterTocItem[];
};

export type BookChapterSummary = {
  id: string;
  bookId: string;
  position: number;
  title: string;
  slug: string;
  partTitle: string | null;
  parentId: string | null;
  level: number;
  sourceUrl: string | null;
  materialId: string | null;
  markdownLength: number;
};
