/**
 * Bounded JSON body reader for App Router route handlers.
 *
 * Rejects non-JSON Content-Type, oversized Content-Length, and bodies that
 * exceed maxBytes after buffering. Prefer this over `req.json()` on mutating
 * endpoints so a huge payload never reaches Zod/DB.
 */
import { ApiError } from '@/lib/api/errors';

export const DEFAULT_JSON_MAX_BYTES = 256 * 1024; // 256 KB
export const QUIZ_ANSWERS_JSON_MAX_BYTES = 1_048_576; // 1 MB

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const base = value.split(';')[0]?.trim().toLowerCase();
  return base === 'application/json';
}

export async function readJsonBody(
  req: Request,
  opts: { maxBytes?: number } = {},
): Promise<unknown> {
  const maxBytes = opts.maxBytes ?? DEFAULT_JSON_MAX_BYTES;

  if (!isJsonContentType(req.headers.get('content-type'))) {
    throw ApiError.badRequest('Content-Type must be application/json');
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > maxBytes) {
      throw ApiError.payloadTooLarge();
    }
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength > maxBytes) {
    throw ApiError.payloadTooLarge();
  }

  if (buf.byteLength === 0) {
    throw ApiError.badRequest('Request body is required');
  }

  try {
    return JSON.parse(buf.toString('utf8')) as unknown;
  } catch {
    throw ApiError.badRequest('Invalid JSON body');
  }
}

/**
 * Soft variant: returns null on empty body instead of throwing.
 * Still enforces content-type and size when a body is present.
 */
export async function readJsonBodyOptional(
  req: Request,
  opts: { maxBytes?: number } = {},
): Promise<unknown | null> {
  const maxBytes = opts.maxBytes ?? DEFAULT_JSON_MAX_BYTES;

  const contentLength = req.headers.get('content-length');
  if (contentLength === '0') return null;

  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > maxBytes) {
      throw ApiError.payloadTooLarge();
    }
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) return null;
  if (buf.byteLength > maxBytes) {
    throw ApiError.payloadTooLarge();
  }

  if (!isJsonContentType(req.headers.get('content-type'))) {
    throw ApiError.badRequest('Content-Type must be application/json');
  }

  try {
    return JSON.parse(buf.toString('utf8')) as unknown;
  } catch {
    throw ApiError.badRequest('Invalid JSON body');
  }
}
