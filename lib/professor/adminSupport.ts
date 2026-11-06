import { adminHasTenantDataAccess } from '@/lib/authz/supportAccess';
import type { UserData } from '@/lib/getOrCreateUser';

/** Platform ADMIN may act on tenant teaching data only with an active support grant. */
export async function adminSupportForTenant(
  user: Pick<UserData, 'id'> & { platformStaff?: boolean | null },
  tenantId: string | null | undefined,
): Promise<boolean> {
  if (!user.platformStaff || !tenantId) return false;
  return adminHasTenantDataAccess(user, tenantId);
}
