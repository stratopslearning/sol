/**
 * Hosted book writes/reads under FORCE RLS (drizzle/0091_hosted_books_definers.sql).
 */
import { sql } from 'drizzle-orm';

import { db } from '@/app/db';
import type { hostedBooks } from '@/app/db/schema';

function rowsFromExecute<T>(result: unknown): T[] {
  return (
    (result as { rows?: T[] }).rows ??
    (Array.isArray(result) ? (result as T[]) : [])
  );
}

function parseJsonb<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return JSON.parse(raw) as T;
  return raw as T;
}

function asDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value;
  if (value == null) return new Date(0);
  return new Date(value);
}

type HostedBookRow = typeof hostedBooks.$inferSelect;

type RawBook = {
  id: string;
  course_id: string;
  tenant_id?: string | null;
  created_by_user_id: string;
  title: string;
  source_kind: HostedBookRow['sourceKind'];
  source_url?: string | null;
  s3_key?: string | null;
  status: HostedBookRow['status'];
  error_message?: string | null;
  is_released?: boolean;
  deleted_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapBook(raw: RawBook): HostedBookRow {
  return {
    id: raw.id,
    courseId: raw.course_id,
    tenantId: raw.tenant_id ?? null,
    createdByUserId: raw.created_by_user_id,
    title: raw.title,
    sourceKind: raw.source_kind,
    sourceUrl: raw.source_url ?? null,
    s3Key: raw.s3_key ?? null,
    status: raw.status,
    errorMessage: raw.error_message ?? null,
    isReleased: Boolean(raw.is_released),
    deletedAt: raw.deleted_at ? asDate(raw.deleted_at) : null,
    createdAt: asDate(raw.created_at),
    updatedAt: asDate(raw.updated_at),
  };
}

export async function createHostedBookDefiner(payload: {
  courseId: string;
  createdByUserId: string;
  title: string;
  sourceKind: 'WEBBOOK_URL' | 'EPUB' | 'PRESSBOOKS_XML' | 'PDF';
  sourceUrl?: string | null;
  s3Key?: string | null;
}): Promise<HostedBookRow> {
  const result = await db.execute(sql`
    SELECT sol_create_hosted_book(${JSON.stringify(payload)}::jsonb) AS row
  `);
  const raw = parseJsonb<RawBook>(rowsFromExecute<{ row: unknown }>(result)[0]?.row);
  if (!raw?.id) throw new Error('sol_create_hosted_book returned no row');
  return mapBook(raw);
}

export async function updateHostedBookDefiner(payload: {
  bookId: string;
  s3Key?: string | null;
  title?: string;
  status?: HostedBookRow['status'];
  errorMessage?: string | null;
  isReleased?: boolean;
  deletedAt?: string | null;
  /** When set, update only if current status matches (claim / CAS). */
  onlyIfStatus?: HostedBookRow['status'];
}): Promise<HostedBookRow | null> {
  const result = await db.execute(sql`
    SELECT sol_update_hosted_book(${JSON.stringify(payload)}::jsonb) AS row
  `);
  const raw = parseJsonb<RawBook>(rowsFromExecute<{ row: unknown }>(result)[0]?.row);
  if (!raw?.id) return null;
  return mapBook(raw);
}

export async function fetchHostedBookByIdDefiner(
  bookId: string,
): Promise<HostedBookRow | null> {
  const result = await db.execute(sql`
    SELECT sol_hosted_book_by_id(${bookId}::uuid) AS row
  `);
  const raw = parseJsonb<RawBook>(rowsFromExecute<{ row: unknown }>(result)[0]?.row);
  if (!raw?.id) return null;
  return mapBook(raw);
}

export async function fetchHostedBooksForCourseDefiner(
  courseId: string,
): Promise<HostedBookRow[]> {
  const result = await db.execute(sql`
    SELECT sol_hosted_books_for_course(${courseId}::uuid) AS rows
  `);
  const raw = parseJsonb<RawBook[]>(
    rowsFromExecute<{ rows: unknown }>(result)[0]?.rows,
  );
  if (!Array.isArray(raw)) return [];
  return raw.map(mapBook);
}

export async function fetchBookChaptersTocForCourseDefiner(
  courseId: string,
): Promise<
  Array<{
    id: string;
    bookId: string;
    position: number;
    title: string;
    partTitle: string | null;
    parentId: string | null;
    level: number;
  }>
> {
  const result = await db.execute(sql`
    SELECT sol_book_chapters_toc_for_course(${courseId}::uuid) AS rows
  `);
  const raw = parseJsonb<
    Array<{
      id: string;
      bookId: string;
      position: number;
      title: string;
      partTitle: string | null;
      parentId: string | null;
      level: number | null;
    }>
  >(rowsFromExecute<{ rows: unknown }>(result)[0]?.rows);
  if (!Array.isArray(raw)) return [];
  return raw.map((ch) => ({
    id: ch.id,
    bookId: ch.bookId,
    position: Number(ch.position ?? 0),
    title: ch.title,
    partTitle: ch.partTitle ?? null,
    parentId: ch.parentId ?? null,
    level: Number(ch.level ?? 0),
  }));
}

export async function fetchBookChaptersTocForBookDefiner(
  bookId: string,
): Promise<
  Array<{
    id: string;
    bookId: string;
    position: number;
    title: string;
    slug: string;
    partTitle: string | null;
    parentId: string | null;
    level: number;
  }>
> {
  const result = await db.execute(sql`
    SELECT sol_book_chapters_toc_for_book(${bookId}::uuid) AS rows
  `);
  const raw = parseJsonb<
    Array<{
      id: string;
      bookId: string;
      position: number;
      title: string;
      slug?: string | null;
      partTitle: string | null;
      parentId: string | null;
      level: number | null;
    }>
  >(rowsFromExecute<{ rows: unknown }>(result)[0]?.rows);
  if (!Array.isArray(raw)) return [];
  return raw.map((ch) => ({
    id: ch.id,
    bookId: ch.bookId,
    position: Number(ch.position ?? 0),
    title: ch.title,
    slug: String(ch.slug ?? ''),
    partTitle: ch.partTitle ?? null,
    parentId: ch.parentId ?? null,
    level: Number(ch.level ?? 0),
  }));
}

export async function fetchBookChapterForReaderDefiner(
  chapterId: string,
): Promise<{
  id: string;
  bookId: string;
  courseId: string;
  title: string;
  slug: string;
  partTitle: string | null;
  position: number;
  parentId: string | null;
  level: number;
  markdown: string;
  html: string | null;
} | null> {
  const result = await db.execute(sql`
    SELECT sol_book_chapter_for_reader(${chapterId}::uuid) AS row
  `);
  const raw = parseJsonb<Record<string, unknown>>(
    rowsFromExecute<{ row: unknown }>(result)[0]?.row,
  );
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    bookId: String(raw.book_id ?? raw.bookId),
    courseId: String(raw.course_id ?? raw.courseId),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    partTitle:
      raw.part_title != null
        ? String(raw.part_title)
        : raw.partTitle != null
          ? String(raw.partTitle)
          : null,
    position: Number(raw.position ?? 0),
    parentId:
      raw.parent_id != null
        ? String(raw.parent_id)
        : raw.parentId != null
          ? String(raw.parentId)
          : null,
    level: Number(raw.level ?? 0),
    markdown: String(raw.markdown ?? ''),
    html:
      raw.html != null
        ? String(raw.html)
        : null,
  };
}

export async function assignBookSectionsDefiner(payload: {
  bookId: string;
  assignedBy: string;
  sectionIds: string[];
}): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT sol_assign_book_sections(${JSON.stringify(payload)}::jsonb) AS ids
  `);
  const ids = rowsFromExecute<{ ids: unknown }>(result)[0]?.ids;
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => String(id));
}

export async function softDeleteBookChaptersDefiner(
  bookId: string,
): Promise<void> {
  await db.execute(sql`
    SELECT sol_soft_delete_book_chapters(${bookId}::uuid)
  `);
}

export async function insertBookChapterDefiner(payload: {
  bookId: string;
  courseId: string;
  parentId?: string | null;
  level: number;
  position: number;
  title: string;
  slug: string;
  partTitle?: string | null;
  markdown: string;
  html?: string | null;
  sourceUrl?: string | null;
  materialId?: string | null;
}): Promise<string> {
  const result = await db.execute(sql`
    SELECT sol_insert_book_chapter(${JSON.stringify(payload)}::jsonb) AS id
  `);
  const id = rowsFromExecute<{ id: string }>(result)[0]?.id;
  if (!id) throw new Error('sol_insert_book_chapter returned no id');
  return id;
}
