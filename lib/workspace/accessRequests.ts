import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { users, workspaceAccessRequests, workspaces } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { withTenant } from '@/lib/db/tenantContext';
import { createWorkspaceInvite } from '@/lib/workspace/invites';
import { userCanInviteWorkspaceFaculty } from '@/lib/workspace/entitlement';
import { getRequiredBaseUrl } from '@/lib/stripe';

export type AccessRequestRole = 'instructor' | 'admin';
export type AccessRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'blocked';

export async function createWorkspaceAccessRequest(opts: {
  workspaceId: string;
  email: string;
  name?: string | null;
  claimedRole?: AccessRequestRole;
  userId?: string | null;
}): Promise<{ id: string }> {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw ApiError.badRequest('Valid email is required');
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, opts.workspaceId),
    columns: { id: true },
  });
  if (!workspace) throw ApiError.notFound('Workspace not found');

  return withTenant(
    opts.workspaceId,
    opts.userId ?? null,
    async (tx) => {
      const existing = await tx.query.workspaceAccessRequests.findFirst({
        where: and(
          eq(workspaceAccessRequests.workspaceId, opts.workspaceId),
          sql`lower(${workspaceAccessRequests.email}) = ${email}`,
          eq(workspaceAccessRequests.status, 'pending'),
        ),
      });
      if (existing) return { id: existing.id };

      const [row] = await tx
        .insert(workspaceAccessRequests)
        .values({
          workspaceId: opts.workspaceId,
          email,
          name: opts.name?.trim() || null,
          claimedRole: opts.claimedRole ?? 'instructor',
          userId: opts.userId ?? null,
          status: 'pending',
        })
        .returning({ id: workspaceAccessRequests.id });

      return { id: row.id };
    },
  );
}

export async function listPendingAccessRequests(
  workspaceId: string,
  actorUserId?: string | null,
) {
  return withTenant(workspaceId, actorUserId ?? null, async (tx) => {
    return tx.query.workspaceAccessRequests.findMany({
      where: and(
        eq(workspaceAccessRequests.workspaceId, workspaceId),
        eq(workspaceAccessRequests.status, 'pending'),
      ),
      orderBy: [desc(workspaceAccessRequests.createdAt)],
      limit: 100,
    });
  });
}

export async function decideAccessRequest(opts: {
  requestId: string;
  workspaceId: string;
  actorUserId: string;
  decision: 'approved' | 'rejected' | 'blocked';
  note?: string | null;
  /** Approver-chosen role on approve. Defaults to instructor; never trusts requester admin. */
  role?: AccessRequestRole;
}): Promise<{ claimUrl?: string; expiresAt?: Date; email?: string; role?: string }> {
  const can = await userCanInviteWorkspaceFaculty(
    opts.actorUserId,
    opts.workspaceId,
  );
  if (!can) {
    throw ApiError.forbidden('Only workspace owner or admin can decide requests');
  }

  const request = await withTenant(
    opts.workspaceId,
    opts.actorUserId,
    async (tx) => {
      const row = await tx.query.workspaceAccessRequests.findFirst({
        where: and(
          eq(workspaceAccessRequests.id, opts.requestId),
          eq(workspaceAccessRequests.workspaceId, opts.workspaceId),
        ),
      });
      if (!row) throw ApiError.notFound('Request not found');
      if (row.status !== 'pending') {
        throw ApiError.badRequest('Request is already decided');
      }
      return row;
    },
  );

  if (opts.decision !== 'approved') {
    await withTenant(opts.workspaceId, opts.actorUserId, async (tx) => {
      await tx
        .update(workspaceAccessRequests)
        .set({
          status: opts.decision,
          decidedBy: opts.actorUserId,
          decidedAt: new Date(),
          note: opts.note?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(workspaceAccessRequests.id, opts.requestId));
    });
    return {};
  }

  const role: AccessRequestRole =
    opts.role === 'admin' ? 'admin' : 'instructor';

  let baseUrl: string | undefined;
  try {
    baseUrl = getRequiredBaseUrl();
  } catch {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
  }

  // Mint invite first so a failed invite leaves the request pending (retryable).
  const invite = await createWorkspaceInvite({
    workspaceId: opts.workspaceId,
    email: request.email,
    role,
    baseUrl,
  });

  await withTenant(opts.workspaceId, opts.actorUserId, async (tx) => {
    await tx
      .update(workspaceAccessRequests)
      .set({
        status: 'approved',
        decidedBy: opts.actorUserId,
        decidedAt: new Date(),
        note: opts.note?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(workspaceAccessRequests.id, opts.requestId));
  });

  return {
    claimUrl: invite.claimUrl,
    expiresAt: invite.expiresAt,
    email: request.email,
    role,
  };
}

export async function accessRequestDigestStats(workspaceId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return withTenant(workspaceId, null, async (tx) => {
    const pending = await tx.query.workspaceAccessRequests.findMany({
      where: and(
        eq(workspaceAccessRequests.workspaceId, workspaceId),
        eq(workspaceAccessRequests.status, 'pending'),
      ),
      columns: { id: true },
    });
    const recent = await tx.query.workspaceAccessRequests.findMany({
      where: and(
        eq(workspaceAccessRequests.workspaceId, workspaceId),
        gte(workspaceAccessRequests.createdAt, since),
      ),
      columns: { id: true, status: true },
    });
    const rejectedRecent = await tx.query.workspaceAccessRequests.findMany({
      where: and(
        eq(workspaceAccessRequests.workspaceId, workspaceId),
        eq(workspaceAccessRequests.status, 'rejected'),
        gte(workspaceAccessRequests.decidedAt, since),
      ),
      columns: { id: true },
    });

    return {
      pendingCount: pending.length,
      newCount: recent.length,
      rejectedCount: rejectedRecent.length,
    };
  });
}

/** Resolve workspace id by slug for public request form. */
export async function findWorkspaceIdBySlug(
  slug: string,
): Promise<string | null> {
  const row = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug.trim().toLowerCase()),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export async function actorEmail(userId: string): Promise<string | null> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  });
  return row?.email?.trim().toLowerCase() ?? null;
}
