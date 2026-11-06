/**
 * Request-scoped tenant gate: resolve active workspace, then run work under
 * withTenant so RLS FORCE policies see app.tenant_id.
 */
import { db } from '@/app/db';
import { withTenant } from '@/lib/db/tenantContext';

type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
import { getActiveWorkspaceId } from '@/lib/workspace/activeWorkspace';
import { listActiveMembershipsForUser } from '@/lib/workspace/entitlement';
import type { UserData } from '@/lib/getOrCreateUser';

export class TenantGateError extends Error {
  constructor(
    message: string,
    readonly status: number = 403,
  ) {
    super(message);
    this.name = 'TenantGateError';
  }
}

export async function resolveRequestTenantId(
  user: Pick<UserData, 'id'>,
  explicitTenantId?: string | null,
): Promise<string> {
  if (explicitTenantId) {
    const memberships = await listActiveMembershipsForUser(user.id);
    if (!memberships.some((m) => m.workspaceId === explicitTenantId)) {
      throw new TenantGateError('Not a member of that workspace');
    }
    return explicitTenantId;
  }
  const active = await getActiveWorkspaceId(user.id);
  if (!active) {
    throw new TenantGateError('No active workspace — join or create one', 400);
  }
  return active;
}

export async function withRequestTenant<T>(
  user: Pick<UserData, 'id'>,
  fn: (tx: TenantTx) => Promise<T>,
  explicitTenantId?: string | null,
): Promise<T> {
  const tenantId = await resolveRequestTenantId(user, explicitTenantId);
  return withTenant(tenantId, user.id, fn);
}
