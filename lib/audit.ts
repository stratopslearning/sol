/**
 * Append-only audit log helper.
 *
 * Every privileged mutation (admin user/section/course/quiz CRUD, role
 * changes, paid flag adjustments) should write an entry here so we have a
 * forensic record. We intentionally do NOT throw on logging failures — a
 * Sentry breadcrumb is preferred to letting an audit-log outage take down
 * the actual feature path.
 */
import type { NextRequest } from 'next/server';

import { db } from '@/app/db';
import { auditLog } from '@/app/db/schema';

export interface AuditEntry {
  actorUserId?: string | null;
  actorClerkId?: string | null;
  action: string; // e.g. 'admin.user.delete'
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorUserId: entry.actorUserId ?? null,
      actorClerkId: entry.actorClerkId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    console.error('Audit log write failed:', err, entry);
  }
}

export function extractRequestMeta(req: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  // Prefer the standard forwarded headers; fall back to the (legacy) Vercel
  // header. None of these are trusted for authn — they're only logged for
  // forensic purposes.
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
  const userAgent = req.headers.get('user-agent') || null;
  return { ip, userAgent };
}
