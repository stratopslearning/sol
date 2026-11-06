/**
 * Append-only audit log helper.
 *
 * All writes go through SECURITY DEFINER append_audit(...). Failures raise —
 * never silently dropped (webhook / auth / support paths must surface errors).
 */
import type { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';

import { db } from '@/app/db';

export interface AuditEntry {
  actorUserId?: string | null;
  actorClerkId?: string | null;
  action: string; // e.g. 'admin.user.delete'
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  tenantId?: string | null;
  /** Platform-wide event with no tenant (webhooks, auth). Explicit — not a silent omit. */
  platform?: boolean;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const platform = Boolean(entry.platform) || entry.tenantId == null;
  if (!platform && !entry.tenantId) {
    throw new Error(
      `append_audit refused: action "${entry.action}" needs tenantId or platform: true`,
    );
  }

  const result = await db.execute(sql`
    SELECT append_audit(
      ${entry.actorUserId ?? null}::uuid,
      ${entry.actorClerkId ?? null}::text,
      ${entry.action}::text,
      ${entry.targetType ?? null}::text,
      ${entry.targetId ?? null}::text,
      ${JSON.stringify(entry.metadata ?? null)}::jsonb,
      ${entry.tenantId ?? null}::uuid,
      ${entry.ip ?? null}::text,
      ${entry.userAgent ?? null}::text,
      ${platform}::boolean
    ) AS id
  `);

  const row = (result as unknown as { rows?: { id: string }[] }).rows?.[0]
    ?? (Array.isArray(result) ? (result as unknown as { id: string }[])[0] : undefined);
  if (!row?.id) {
    throw new Error(`append_audit returned no id for action "${entry.action}"`);
  }
}

export function extractRequestMeta(req: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
  const userAgent = req.headers.get('user-agent') || null;
  return { ip, userAgent };
}

/** Exam start/submit audit. Propagates append_audit failures. */
export async function logQuizAttemptAudit(opts: {
  action: 'quiz.attempt.start' | 'quiz.attempt.submit';
  actorUserId: string;
  actorClerkId?: string | null;
  attemptId: string;
  quizId: string;
  assignmentId: string;
  tenantId?: string | null;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
}): Promise<void> {
  const meta = opts.req
    ? extractRequestMeta(opts.req)
    : { ip: null, userAgent: null };
  await logAudit({
    actorUserId: opts.actorUserId,
    actorClerkId: opts.actorClerkId ?? null,
    action: opts.action,
    targetType: 'attempt',
    targetId: opts.attemptId,
    tenantId: opts.tenantId ?? null,
    platform: !opts.tenantId,
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
  tenantId?: string | null;
}): Promise<void> {
  await logAudit({
    actorUserId: opts.actorUserId,
    actorClerkId: opts.actorClerkId ?? null,
    action: 'education.gradebook.view',
    targetType: 'section',
    targetId: opts.sectionId,
    tenantId: opts.tenantId ?? null,
    platform: !opts.tenantId,
    metadata: { viewerRole: opts.role },
  });
}
