import { authorize } from '@/lib/authz/authorize';
import { ApiError } from '@/lib/api/errors';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id'> & { platformStaff?: boolean | null };

export async function assertWorkspaceFaculty(
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  const ok =
    (await authorize(user, 'catalog.read', {
      tenantId: workspaceId,
      scopeType: 'organization',
      scopeId: workspaceId,
    })) ||
    (await authorize(user, 'knowledge.manage', {
      tenantId: workspaceId,
      scopeType: 'organization',
      scopeId: workspaceId,
    })) ||
    (await authorize(user, 'content.read', {
      tenantId: workspaceId,
      scopeType: 'organization',
      scopeId: workspaceId,
    }));
  if (!ok) {
    throw ApiError.forbidden('Not a faculty member of this workspace');
  }
}

/** Shared-library mutate + connector admin (owner/admin only). */
export async function assertWorkspaceLibraryAdmin(
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  const ok = await authorize(user, 'knowledge.manage', {
    tenantId: workspaceId,
    scopeType: 'organization',
    scopeId: workspaceId,
  });
  if (!ok) {
    throw ApiError.forbidden(
      'Only workspace owners or admins can manage the shared library',
    );
  }
}

/**
 * Library coordinator = `knowledge.manage` at organization scope
 * (owner/admin role bindings). Membership seats carry no power.
 */
export async function isWorkspaceKnowledgeCoordinator(
  user: AuthUser,
  workspaceId: string,
): Promise<boolean> {
  return authorize(user, 'knowledge.manage', {
    tenantId: workspaceId,
    scopeType: 'organization',
    scopeId: workspaceId,
  });
}
