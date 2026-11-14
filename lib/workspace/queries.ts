import { fetchWorkspaceCoursesWithSections } from '@/lib/workspace/workspaceScopedReads';

/**
 * Admin course listing scoped to a workspace.
 * Pass `null` only for explicit cross-tenant admin dumps (rare) — returns [].
 */
export async function listCoursesForWorkspace(workspaceId: string | null) {
  if (workspaceId === null) {
    return [];
  }
  const rows = await fetchWorkspaceCoursesWithSections(workspaceId);
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    workspaceId: c.workspaceId,
    tenantId: c.tenantId,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    sections: c.sections,
  }));
}

/** Parse admin workspace scope from query params (no silent default tenant). */
export function resolveWorkspaceScopeParam(
  raw: string | string[] | undefined,
): string | 'all' | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'all') return 'all';
  if (value && /^[0-9a-f-]{36}$/i.test(value)) return value;
  return null;
}
