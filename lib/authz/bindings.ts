import { clearBindingCache } from '@/lib/authz/authorize';
import type { AuthzScopeType } from '@/lib/authz/authorize';
import { ApiError } from '@/lib/api/errors';
import {
  isValidRoleScopePair,
  roleIsSupersetOf,
  type BindingRole,
} from '@/lib/authz/permissions';
import {
  countActiveOwnersDefiner,
  findRoleBindingDefiner,
  listActiveBindingsForScopeDefiner,
  listRoleBindingsAtUserScope,
  revokeRoleBindingDefiner,
  roleBindingByIdDefiner,
  upsertRoleBindingDefiner,
} from '@/lib/db/facultyWriteDefiners';

export async function upsertRoleBinding(opts: {
  tenantId: string;
  userId: string;
  scopeType: AuthzScopeType;
  scopeId: string;
  role: BindingRole;
  grantedBy?: string | null;
}): Promise<{ bindingId: string; created: boolean }> {
  if (!isValidRoleScopePair(opts.role, opts.scopeType)) {
    throw ApiError.badRequest(
      `Role ${opts.role} cannot be bound at ${opts.scopeType} scope`,
    );
  }

  // 0043: at most one ACTIVE binding per (user, scope_type, scope_id).
  const activeAtScope = await listRoleBindingsAtUserScope(
    opts.userId,
    opts.scopeType,
    opts.scopeId,
  );
  for (const other of activeAtScope) {
    if (other.role === opts.role) continue;
    const otherRole = other.role as BindingRole;
    if (roleIsSupersetOf(otherRole, opts.role)) {
      return { bindingId: other.id, created: false };
    }
    if (roleIsSupersetOf(opts.role, otherRole)) {
      await revokeRoleBinding(other.id);
      continue;
    }
    throw ApiError.conflict(
      `User already holds ${otherRole} at this scope; ${opts.role} is not a permission superset. Resolve manually.`,
    );
  }

  const existing = await findRoleBindingDefiner({
    tenantId: opts.tenantId,
    userId: opts.userId,
    scopeType: opts.scopeType,
    scopeId: opts.scopeId,
    role: opts.role,
  });

  if (existing && !existing.revokedAt) {
    return { bindingId: existing.id, created: false };
  }

  const result = await upsertRoleBindingDefiner({
    tenantId: opts.tenantId,
    userId: opts.userId,
    scopeType: opts.scopeType,
    scopeId: opts.scopeId,
    role: opts.role,
    grantedBy: opts.grantedBy ?? null,
  });
  clearBindingCache(opts.userId, opts.tenantId);
  return result;
}

/** Count active org-scope owners for a workspace. */
export async function countActiveOwners(tenantId: string): Promise<number> {
  return countActiveOwnersDefiner(tenantId);
}

export async function revokeRoleBinding(bindingId: string): Promise<void> {
  const existing = await roleBindingByIdDefiner(bindingId);
  if (!existing || existing.revokedAt) return;
  try {
    await revokeRoleBindingDefiner(bindingId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Cannot remove the last workspace owner')) {
      throw ApiError.conflict(
        'Cannot remove the last workspace owner. Transfer ownership first.',
      );
    }
    throw err;
  }
  clearBindingCache(existing.userId, existing.tenantId);
}

export async function revokeRoleBindingMatching(opts: {
  tenantId: string;
  userId: string;
  scopeType: AuthzScopeType;
  scopeId: string;
  role: BindingRole;
}): Promise<void> {
  const rows = await listRoleBindingsAtUserScope(
    opts.userId,
    opts.scopeType,
    opts.scopeId,
  );
  for (const row of rows) {
    if (
      row.tenantId === opts.tenantId &&
      row.role === opts.role &&
      !row.revokedAt
    ) {
      await revokeRoleBinding(row.id);
    }
  }
}

export async function listActiveBindingsForScope(opts: {
  tenantId: string;
  scopeType: AuthzScopeType;
  scopeId: string;
}) {
  return listActiveBindingsForScopeDefiner(opts);
}
