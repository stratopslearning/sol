/**
 * Platform staff may touch tenant data only with an active support grant + audit.
 */
import { ApiError } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import {
  hasActiveSupportAccess,
} from '@/lib/authz/supportAccess';
import type { UserData } from '@/lib/getOrCreateUser';

type StaffUser = Pick<UserData, 'id' | 'clerkId'> & {
  platformStaff?: boolean | null;
};

function isPlatformStaff(user: StaffUser): boolean {
  return Boolean(user.platformStaff);
}

/**
 * Require platform_staff + active support_access_grants for tenantId.
 * Logs support.tenant_access. Throws ApiError.forbidden otherwise.
 */
export async function requireSupportGrant(
  user: StaffUser,
  tenantId: string,
  opts?: { action?: string; targetType?: string; targetId?: string },
): Promise<void> {
  if (!tenantId) {
    throw ApiError.badRequest('tenantId required for support access');
  }
  if (!isPlatformStaff(user)) {
    throw ApiError.forbidden();
  }
  const ok = await hasActiveSupportAccess(user.id, tenantId);
  if (!ok) {
    throw ApiError.forbidden(
      'Active support access grant required for this tenant',
    );
  }
  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId ?? null,
    action: opts?.action ?? 'support.tenant_access',
    targetType: opts?.targetType ?? 'workspace',
    targetId: opts?.targetId ?? tenantId,
    tenantId,
    metadata: { grantRequired: true },
  });
}

/** Metadata-only admin endpoints that do not return tenant teaching PII. */
export const ADMIN_METADATA_ONLY_ROUTES = [
  '/api/admin/health',
  '/api/admin/usage/summary',
  '/api/admin/workspaces', // list ids/slugs only when documented as metadata
] as const;
