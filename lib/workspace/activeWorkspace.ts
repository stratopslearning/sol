import { cookies } from 'next/headers';

import { listActiveMembershipsForUser } from '@/lib/workspace/entitlement';

export const ACTIVE_WORKSPACE_COOKIE = 'sol_workspace_id';

/** Resolve active workspace for a faculty user (cookie, then sole membership). */
export async function getActiveWorkspaceId(
  userId: string,
): Promise<string | null> {
  const jar = await cookies();
  const fromCookie = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim();
  const memberships = await listActiveMembershipsForUser(userId);
  const allowed = new Set(memberships.map((m) => m.workspaceId));

  if (fromCookie && allowed.has(fromCookie)) {
    return fromCookie;
  }
  if (memberships.length === 1) {
    return memberships[0]!.workspaceId;
  }
  return null;
}

/** Pick workspace id from explicit param, cookie, or sole membership. */
export async function resolveFacultyWorkspaceId(
  userId: string,
  explicitWorkspaceId?: string | null,
): Promise<
  | { ok: true; workspaceId: string }
  | { ok: false; code: 'missing' | 'forbidden'; message: string }
> {
  const memberships = await listActiveMembershipsForUser(userId);
  const allowed = new Set(memberships.map((m) => m.workspaceId));

  const trimmed = explicitWorkspaceId?.trim();
  if (trimmed) {
    if (!allowed.has(trimmed)) {
      return {
        ok: false,
        code: 'forbidden',
        message: 'You are not a member of that workspace.',
      };
    }
    return { ok: true, workspaceId: trimmed };
  }

  const active = await getActiveWorkspaceId(userId);
  if (active) return { ok: true, workspaceId: active };

  if (memberships.length > 1) {
    return {
      ok: false,
      code: 'missing',
      message:
        'Multiple workspaces available. Pass workspaceId or choose an active workspace.',
    };
  }
  if (memberships.length === 1) {
    return { ok: true, workspaceId: memberships[0]!.workspaceId };
  }
  return {
    ok: false,
    code: 'missing',
    message: 'No workspace membership.',
  };
}
