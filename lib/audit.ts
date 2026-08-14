/**
 * Append-only audit log helper.
 *
 * Privileged mutations and FERPA-sensitive disclosures (admin CRUD, enrollment,
 * gradebook access, exports, role/paid changes) write here for forensic and
 * education-record accountability. We intentionally do NOT throw on logging
 * failures — a console error is preferred to letting an audit-log outage take
 * down the actual feature path.
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

/** Fire-and-forget exam start/submit audit. Never throws. */
export function logQuizAttemptAudit(opts: {
  action: 'quiz.attempt.start' | 'quiz.attempt.submit';
  actorUserId: string;
  actorClerkId?: string | null;
  attemptId: string;
  quizId: string;
  assignmentId: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
}): void {
  const meta = opts.req
    ? extractRequestMeta(opts.req)
    : { ip: null, userAgent: null };
  void logAudit({
    actorUserId: opts.actorUserId,
    actorClerkId: opts.actorClerkId ?? null,
    action: opts.action,
    targetType: 'attempt',
    targetId: opts.attemptId,
    metadata: {
      quizId: opts.quizId,
      assignmentId: opts.assignmentId,
      ...opts.metadata,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

/** Log faculty/admin viewing a section gradebook (education-record disclosure). */
export async function logGradebookAccess(opts: {
  actorUserId: string;
  actorClerkId?: string | null;
  sectionId: string;
  role: string;
}): Promise<void> {
  await logAudit({
    actorUserId: opts.actorUserId,
    actorClerkId: opts.actorClerkId ?? null,
    action: 'education.gradebook.view',
    targetType: 'section',
    targetId: opts.sectionId,
    metadata: { viewerRole: opts.role },
  });
}
