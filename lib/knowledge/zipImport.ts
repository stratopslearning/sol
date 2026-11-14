import JSZip from 'jszip';

import { ApiError } from '@/lib/api/errors';
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  MAX_ZIP_KNOWLEDGE_FILES,
  MAX_ZIP_PATH_DEPTH,
  MAX_ZIP_UPLOAD_BYTES,
} from '@/lib/knowledge/constants';

export type ZipKnowledgeEntry = {
  /** Normalized POSIX-ish path inside the archive (no leading slash). */
  relativePath: string;
  fileName: string;
  /** Display title: folder path segments + basename without extension. */
  title: string;
  mimeType: string;
  buffer: Buffer;
};

export type ZipImportSkip = {
  path: string;
  reason: string;
};

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
};

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? '';
}

function mimeForFileName(fileName: string): string | null {
  const ext = extOf(fileName);
  return EXT_MIME[ext] ?? null;
}

/** Reject zip-slip / absolute / weird paths; return normalized relative path. */
export function normalizeZipEntryPath(raw: string): string | null {
  const trimmed = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!trimmed || trimmed.endsWith('/')) return null;
  const parts = trimmed.split('/').filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  if (parts.length > MAX_ZIP_PATH_DEPTH) return null;
  for (const part of parts) {
    if (part === '.' || part === '..') return null;
    if (part.startsWith('__MACOSX')) return null;
    if (part === '.DS_Store') return null;
    if (part.startsWith('.')) return null;
  }
  return parts.join('/');
}

function titleFromPath(relativePath: string): string {
  const parts = relativePath.split('/');
  const file = parts[parts.length - 1]!;
  const base = file.replace(/\.[^.]+$/, '') || file;
  const folders = parts.slice(0, -1);
  if (folders.length === 0) return base.slice(0, 300);
  return `${folders.join(' / ')} / ${base}`.slice(0, 300);
}

/**
 * Unpack a Knowledge zip into uploadable document entries.
 * Only PDF/DOCX/TXT/MD; skips junk paths and oversize members.
 */
export async function extractKnowledgeZipEntries(
  buffer: Buffer,
): Promise<{ entries: ZipKnowledgeEntry[]; skipped: ZipImportSkip[] }> {
  if (buffer.byteLength > MAX_ZIP_UPLOAD_BYTES) {
    throw ApiError.badRequest('Zip exceeds 50 MB limit');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw ApiError.badRequest('Could not read zip archive');
  }

  const entries: ZipKnowledgeEntry[] = [];
  const skipped: ZipImportSkip[] = [];
  const seen = new Set<string>();

  const names = Object.keys(zip.files).sort((a, b) => a.localeCompare(b));
  for (const rawName of names) {
    const file = zip.files[rawName];
    if (!file || file.dir) continue;

    const relativePath = normalizeZipEntryPath(rawName);
    if (!relativePath) {
      skipped.push({ path: rawName, reason: 'Skipped path' });
      continue;
    }

    const fileName = relativePath.split('/').pop()!;
    const mimeType = mimeForFileName(fileName);
    if (!mimeType || !ALLOWED_UPLOAD_MIME.has(mimeType)) {
      skipped.push({
        path: relativePath,
        reason: 'Unsupported type (use PDF, DOCX, TXT, or MD)',
      });
      continue;
    }

    if (seen.has(relativePath.toLowerCase())) {
      skipped.push({ path: relativePath, reason: 'Duplicate path' });
      continue;
    }

    let member: Buffer;
    try {
      member = Buffer.from(await file.async('uint8array'));
    } catch {
      skipped.push({ path: relativePath, reason: 'Could not extract' });
      continue;
    }

    if (member.byteLength === 0) {
      skipped.push({ path: relativePath, reason: 'Empty file' });
      continue;
    }
    if (member.byteLength > MAX_UPLOAD_BYTES) {
      skipped.push({
        path: relativePath,
        reason: 'File exceeds 50 MB limit',
      });
      continue;
    }

    if (entries.length >= MAX_ZIP_KNOWLEDGE_FILES) {
      skipped.push({
        path: relativePath,
        reason: `Limit of ${MAX_ZIP_KNOWLEDGE_FILES} files reached`,
      });
      continue;
    }

    seen.add(relativePath.toLowerCase());
    entries.push({
      relativePath,
      fileName,
      title: titleFromPath(relativePath),
      mimeType,
      buffer: member,
    });
  }

  if (entries.length === 0) {
    throw ApiError.badRequest(
      'Zip had no supported files (PDF, DOCX, TXT, or MD)',
    );
  }

  return { entries, skipped };
}

export function isKnowledgeZipUpload(fileName: string, mimeType: string): boolean {
  const mime = (mimeType || '').toLowerCase();
  if (/\.zip$/i.test(fileName)) return true;
  return (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    mime === 'multipart/x-zip'
  );
}
