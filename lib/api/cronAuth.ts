import { timingSafeEqual } from 'crypto';

import type { NextRequest } from 'next/server';

/**
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
 * Uses timing-safe compare (same pattern as professor PATs).
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
