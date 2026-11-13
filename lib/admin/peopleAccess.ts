import { sql } from 'drizzle-orm';

import { db } from '@/app/db';

export type PeopleAccessGrant = {
  userId: string;
  kind: 'binding' | 'student';
  role: string;
  scopeType: string;
  scopeId: string;
  tenantId: string | null;
  tenantName: string | null;
  scopeLabel: string | null;
};

/** One compact line per workspace (or learning enrollment group). */
export type PeopleAccessSummaryLine = {
  key: string;
  title: string;
  roles: string[];
  detail?: string;
};

type RawRow = {
  user_id: string;
  kind: string;
  role: string;
  scope_type: string;
  scope_id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  scope_label: string | null;
};

function formatRoleLabel(role: string): string {
  return role.replace(/_/g, ' ');
}

/**
 * Group grants by workspace; dedupe roles. Students collapse under a Learning line
 * (section names in detail) so the People table stays scannable.
 */
export function summarizePeopleAccess(
  grants: PeopleAccessGrant[],
): PeopleAccessSummaryLine[] {
  const workspaces = new Map<
    string,
    { title: string; roles: Set<string> }
  >();
  const studentSections: string[] = [];

  for (const g of grants) {
    if (g.kind === 'student') {
      const label = g.scopeLabel?.trim() || 'Section';
      if (!studentSections.includes(label)) studentSections.push(label);
      continue;
    }
    const key = g.tenantId ?? g.scopeId;
    const title = g.tenantName?.trim() || 'Workspace';
    let entry = workspaces.get(key);
    if (!entry) {
      entry = { title, roles: new Set() };
      workspaces.set(key, entry);
    }
    entry.roles.add(formatRoleLabel(g.role));
  }

  const lines: PeopleAccessSummaryLine[] = [];
  for (const [key, entry] of workspaces) {
    const roles = [...entry.roles].sort((a, b) => a.localeCompare(b));
    lines.push({ key: `ws:${key}`, title: entry.title, roles });
  }
  lines.sort((a, b) => a.title.localeCompare(b.title));

  if (studentSections.length > 0) {
    studentSections.sort((a, b) => a.localeCompare(b));
    lines.push({
      key: 'learning',
      title: 'Learning',
      roles: ['student'],
      detail: studentSections.join(', '),
    });
  }

  return lines;
}

/**
 * Cross-tenant active bindings + student enrollments for Platform → People.
 * Uses SECURITY DEFINER sol_admin_people_access() (bypasses FORCE RLS).
 */
export async function loadPeopleAccessByUserId(): Promise<
  Map<string, PeopleAccessGrant[]>
> {
  const result = await db.execute(sql`SELECT * FROM sol_admin_people_access()`);
  const rows =
    (result as unknown as { rows?: RawRow[] }).rows ??
    (Array.isArray(result) ? (result as unknown as RawRow[]) : []);

  const map = new Map<string, PeopleAccessGrant[]>();
  for (const row of rows) {
    const grant: PeopleAccessGrant = {
      userId: row.user_id,
      kind: row.kind === 'student' ? 'student' : 'binding',
      role: row.role,
      scopeType: row.scope_type,
      scopeId: row.scope_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      scopeLabel: row.scope_label,
    };
    const list = map.get(grant.userId) ?? [];
    list.push(grant);
    map.set(grant.userId, list);
  }

  return map;
}
