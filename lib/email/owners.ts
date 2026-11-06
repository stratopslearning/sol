import { and, eq, inArray, isNull } from 'drizzle-orm';

import { roleBindings, users } from '@/app/db/schema';
import { withTenant } from '@/lib/db/tenantContext';

/**
 * Active owner/admin emails for a workspace (organization-scoped bindings).
 */
export async function listWorkspaceOwnerAdminEmails(
  workspaceId: string,
): Promise<string[]> {
  return withTenant(workspaceId, null, async (tx) => {
    const bindings = await tx.query.roleBindings.findMany({
      where: and(
        eq(roleBindings.tenantId, workspaceId),
        eq(roleBindings.scopeType, 'organization'),
        eq(roleBindings.scopeId, workspaceId),
        inArray(roleBindings.role, ['owner', 'admin']),
        isNull(roleBindings.revokedAt),
      ),
      columns: { userId: true },
    });
    if (bindings.length === 0) return [];

    const userIds = [...new Set(bindings.map((b) => b.userId))];
    const rows = await tx.query.users.findMany({
      where: inArray(users.id, userIds),
      columns: { email: true },
    });

    return [
      ...new Set(
        rows
          .map((r) => r.email?.trim().toLowerCase())
          .filter((e): e is string => Boolean(e)),
      ),
    ];
  });
}
