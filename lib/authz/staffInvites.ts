import { createHash, randomBytes } from 'crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { sectionStaffInvites } from '@/app/db/schema';
import { grantSectionStaff } from '@/lib/authz/staffGrants';
import { withBasePath } from '@/lib/basePath';
import { withTenant } from '@/lib/db/tenantContext';

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function mintToken(): string {
  return randomBytes(32).toString('base64url');
}

function buildClaimUrl(token: string, baseUrl?: string): string {
  const path = withBasePath(
    `/staff/claim?token=${encodeURIComponent(token)}`,
  );
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

type StaffInviteRow = {
  id: string;
  tenant_id: string;
  section_id: string;
  email: string;
  role: string;
  token_hash: string;
  granted_by: string | null;
  expires_at: Date;
  claimed_at: Date | null;
  claimed_by_user_id: string | null;
  created_at: Date;
};

function rowsFromExecute<T>(result: unknown): T[] {
  return (
    (result as { rows?: T[] }).rows ??
    (Array.isArray(result) ? (result as T[]) : [])
  );
}

export async function createSectionStaffInvite(opts: {
  tenantId: string;
  sectionId: string;
  email: string;
  role: 'ta' | 'grader';
  grantedBy: string;
  baseUrl?: string;
}): Promise<{
  inviteId: string;
  token: string;
  claimUrl: string;
  expiresAt: Date;
}> {
  const email = opts.email.trim().toLowerCase();
  const token = mintToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const invite = await withTenant(opts.tenantId, opts.grantedBy, async (tx) => {
    await tx
      .update(sectionStaffInvites)
      .set({ expiresAt: new Date() })
      .where(
        and(
          eq(sectionStaffInvites.sectionId, opts.sectionId),
          sql`lower(${sectionStaffInvites.email}) = ${email}`,
          isNull(sectionStaffInvites.claimedAt),
        ),
      );

    const [row] = await tx
      .insert(sectionStaffInvites)
      .values({
        tenantId: opts.tenantId,
        sectionId: opts.sectionId,
        email,
        role: opts.role,
        tokenHash,
        grantedBy: opts.grantedBy,
        expiresAt,
      })
      .returning();
    return row;
  });

  return {
    inviteId: invite.id,
    token,
    claimUrl: buildClaimUrl(token, opts.baseUrl),
    expiresAt,
  };
}

export async function claimSectionStaffInvite(opts: {
  token: string;
  user: { id: string; email: string };
}): Promise<
  | { ok: true; sectionId: string; role: 'ta' | 'grader'; tenantId: string }
  | { ok: false; error: string; status: 400 | 403 | 404 | 410 }
> {
  const tokenHash = hashToken(opts.token);
  const found = rowsFromExecute<StaffInviteRow>(
    await db.execute(
      sql`SELECT * FROM sol_find_staff_invite_by_token(${tokenHash})`,
    ),
  )[0];
  if (!found) return { ok: false, error: 'Invite not found', status: 404 };
  if (found.claimed_at) {
    return { ok: false, error: 'Invite already claimed', status: 410 };
  }
  if (new Date(found.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Invite expired', status: 410 };
  }
  const sessionEmail = opts.user.email.trim().toLowerCase();
  if (!sessionEmail || sessionEmail !== found.email.toLowerCase()) {
    return {
      ok: false,
      error: 'Sign in with the invited email address to claim this invite',
      status: 403,
    };
  }

  const claimed = rowsFromExecute<{
    id: string;
    tenant_id: string;
    section_id: string;
    email: string;
    role: string;
    granted_by: string | null;
    expires_at: Date;
  }>(
    await db.execute(
      sql`SELECT * FROM sol_claim_staff_invite(${tokenHash}, ${opts.user.id}::uuid)`,
    ),
  )[0];
  if (!claimed) {
    return { ok: false, error: 'Invite already claimed', status: 410 };
  }

  await grantSectionStaff({
    tenantId: claimed.tenant_id,
    userId: opts.user.id,
    sectionId: claimed.section_id,
    role: claimed.role as 'ta' | 'grader',
    grantedBy: claimed.granted_by,
    ensureSeat: true,
  });

  return {
    ok: true,
    sectionId: claimed.section_id,
    role: claimed.role as 'ta' | 'grader',
    tenantId: claimed.tenant_id,
  };
}
