/**
 * Pure analysis of role_bindings conflicts, used by
 * scripts/report-role-binding-conflicts.ts and unit tests.
 *
 * Rules (mirrors drizzle/0043_role_binding_constraints.sql):
 *  - (role, scope_type) must be a valid pair.
 *  - At most one active binding per (user_id, scope_type, scope_id).
 *
 * Auto-resolution only collapses a conflict when ONE role's permission set is a
 * strict superset of every other role in the group; the others are revoked.
 * Anything else is reported for manual resolution.
 */
import {
  isValidRoleScopePair,
  roleIsSupersetOf,
  ROLE_PERMISSIONS,
  type AuthzRole,
} from '@/lib/authz/permissions';

export type BindingRow = {
  id: string;
  tenantId: string;
  userId: string;
  scopeType: string;
  scopeId: string;
  role: string;
};

export type InvalidPair = BindingRow;

export type ConflictGroup = {
  userId: string;
  scopeType: string;
  scopeId: string;
  rows: BindingRow[];
  /** Row to keep when auto-resolvable (strict superset of all others). */
  keep: BindingRow | null;
  /** Rows to revoke when auto-resolvable. */
  revoke: BindingRow[];
};

export type ConflictReport = {
  invalidPairs: InvalidPair[];
  autoResolvable: ConflictGroup[];
  manual: ConflictGroup[];
};

function permCount(role: string): number {
  return ROLE_PERMISSIONS[role as AuthzRole]?.size ?? 0;
}

/** Find the row whose role is a STRICT superset of every other role in the group. */
export function findStrictSupersetWinner(rows: BindingRow[]): BindingRow | null {
  for (const candidate of rows) {
    const others = rows.filter((r) => r.id !== candidate.id);
    const wins = others.every(
      (o) =>
        o.role !== candidate.role &&
        roleIsSupersetOf(candidate.role as AuthzRole, o.role as AuthzRole) &&
        permCount(candidate.role) > permCount(o.role),
    );
    if (wins) return candidate;
  }
  return null;
}

export function analyzeBindingConflicts(rows: BindingRow[]): ConflictReport {
  const invalidPairs = rows.filter(
    (r) => !isValidRoleScopePair(r.role, r.scopeType),
  );

  const groups = new Map<string, BindingRow[]>();
  for (const r of rows) {
    const key = `${r.userId}|${r.scopeType}|${r.scopeId}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const autoResolvable: ConflictGroup[] = [];
  const manual: ConflictGroup[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const winner = findStrictSupersetWinner(list);
    const base = {
      userId: list[0]!.userId,
      scopeType: list[0]!.scopeType,
      scopeId: list[0]!.scopeId,
      rows: list,
    };
    if (winner) {
      autoResolvable.push({
        ...base,
        keep: winner,
        revoke: list.filter((r) => r.id !== winner.id),
      });
    } else {
      manual.push({ ...base, keep: null, revoke: [] });
    }
  }

  return { invalidPairs, autoResolvable, manual };
}

export function formatConflictReport(report: ConflictReport): string {
  const lines: string[] = [];
  lines.push(`invalid (role, scope_type) pairs: ${report.invalidPairs.length}`);
  for (const r of report.invalidPairs) {
    lines.push(
      `  INVALID  binding=${r.id} user=${r.userId} role=${r.role} scope=${r.scopeType}:${r.scopeId}`,
    );
  }
  lines.push(`auto-resolvable (strict superset): ${report.autoResolvable.length}`);
  for (const g of report.autoResolvable) {
    lines.push(
      `  AUTO     user=${g.userId} scope=${g.scopeType}:${g.scopeId} keep=${g.keep?.role} revoke=[${g.revoke
        .map((r) => r.role)
        .join(',')}]`,
    );
  }
  lines.push(`manual (non-superset): ${report.manual.length}`);
  for (const g of report.manual) {
    lines.push(
      `  MANUAL   user=${g.userId} scope=${g.scopeType}:${g.scopeId} roles=[${g.rows
        .map((r) => `${r.role}(${r.id})`)
        .join(',')}]`,
    );
  }
  return lines.join('\n');
}

export function reportHasBlockingIssues(report: ConflictReport): boolean {
  return report.manual.length > 0 || report.invalidPairs.length > 0;
}
