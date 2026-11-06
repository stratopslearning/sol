import type { UserData } from '@/lib/getOrCreateUser';
import { fetchUserHasSupportAccess } from '@/lib/db/entityScopedReads';

/** Time-limited tenant access for platform staff (replaces global data bypass). */
export async function hasActiveSupportAccess(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  return fetchUserHasSupportAccess(userId, tenantId);
}

type PlatformUser = Pick<UserData, 'id' | 'platformStaff'> & {
  platformStaff?: boolean;
};

function isPlatformStaff(user: PlatformUser): boolean {
  return Boolean(user.platformStaff);
}

/**
 * Platform staff may access tenant-scoped **data** only with an active support grant.
 */
export async function platformStaffHasTenantDataAccess(
  user: PlatformUser,
  tenantId: string,
): Promise<boolean> {
  if (!isPlatformStaff(user)) return false;
  return hasActiveSupportAccess(user.id, tenantId);
}

/** @deprecated Prefer platformStaffHasTenantDataAccess */
export async function adminHasTenantDataAccess(
  user: PlatformUser,
  tenantId: string,
): Promise<boolean> {
  return platformStaffHasTenantDataAccess(user, tenantId);
}
