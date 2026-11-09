import { authorize } from '@/lib/authz/authorize';
import { ApiError } from '@/lib/api/errors';
import type { UserData } from '@/lib/getOrCreateUser';
import { requireWorkspaceTeaching } from '@/lib/workspace/entitlement';

type AuthUser = Pick<UserData, 'id'> & { platformStaff?: boolean | null };

async function assertWorkspaceFacultyRole(
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

/** Role check only — safe for reads (policy GET, etc.). */
export async function assertWorkspaceFacultyRead(
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  await assertWorkspaceFacultyRole(user, workspaceId);
}

/**
 * Faculty role + teaching entitlement. Use for knowledge/connector writes.
 * Platform staff skip entitlement (support grant enforced elsewhere).
 */
export async function assertWorkspaceFaculty(
  user: AuthUser,
  workspaceId: string,
): Promise<void> {
  await assertWorkspaceFacultyRole(user, workspaceId);
  await requireWorkspaceTeaching(workspaceId, user);
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
  await requireWorkspaceTeaching(workspaceId, user);
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
