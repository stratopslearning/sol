/**
 * Refuse app/worker boot when the DB role can bypass RLS, owns tables, or is a
 * MEMBER of any public table-owner role. Result is cached once per process.
 */
import { sql } from 'drizzle-orm';

import { db } from '@/app/db';

export class RuntimeRoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeRoleError';
  }
}

export type RuntimeRoleOk = {
  ok: true;
  currentUser: string;
  rolbypassrls: boolean;
};

export type RuntimeRoleFail = {
  ok: false;
  currentUser: string;
  reason: string;
};

export type RuntimeRoleResult = RuntimeRoleOk | RuntimeRoleFail;

type RoleProbeRow = {
  current_user: string;
  rolbypassrls: boolean | null;
  owns_table: boolean;
  member_of_owner: boolean;
  owner_role: string | null;
};

let cached: Promise<RuntimeRoleResult> | undefined;

/** Clear process cache (tests only). */
export function clearRuntimeRoleCache(): void {
  cached = undefined;
}

/**
 * Probe Postgres for unsafe runtime privileges. Safe to call repeatedly —
 * first call wins for the process.
 */
export function assertRuntimeRole(): Promise<RuntimeRoleResult> {
  if (!cached) {
    cached = probeRuntimeRole().catch((err) => {
      // Allow a later retry if the first probe failed (e.g. cold DB).
      cached = undefined;
      throw err;
    });
  }
  return cached;
}

/** Throw if the runtime role is unsafe. */
export async function requireSafeRuntimeRole(): Promise<RuntimeRoleOk> {
  const result = await assertRuntimeRole();
  if (!result.ok) {
    throw new RuntimeRoleError(result.reason);
  }
  return result;
}

async function probeRuntimeRole(): Promise<RuntimeRoleResult> {
  const rows = await db.execute(sql`
    WITH owners AS (
      SELECT DISTINCT c.relowner::regrole::text AS owner_role
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p', 'm', 'v')
    ),
    me AS (
      SELECT
        current_user::text AS current_user,
        COALESCE(
          (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user),
          false
        ) AS rolbypassrls
    )
    SELECT
      me.current_user,
      me.rolbypassrls,
      EXISTS (
        SELECT 1
        FROM pg_tables t
        WHERE t.schemaname = 'public'
          AND t.tableowner = me.current_user
      ) AS owns_table,
      EXISTS (
        SELECT 1
        FROM owners o
        WHERE o.owner_role IS DISTINCT FROM me.current_user
          AND pg_has_role(me.current_user, o.owner_role, 'MEMBER')
      ) AS member_of_owner,
      (
        SELECT o.owner_role
        FROM owners o
        WHERE o.owner_role IS DISTINCT FROM me.current_user
          AND pg_has_role(me.current_user, o.owner_role, 'MEMBER')
        LIMIT 1
      ) AS owner_role
    FROM me
  `);

  const probe = rows as unknown as { rows?: RoleProbeRow[] } & RoleProbeRow[];
  const row = (probe.rows?.[0] ?? probe[0]) as RoleProbeRow | undefined;
  if (!row) {
    return {
      ok: false,
      currentUser: 'unknown',
      reason:
        'Refusing to start: could not determine current database role for runtime guard.',
    };
  }

  const currentUser = String(row.current_user);
  const lower = currentUser.toLowerCase();

  if (lower === 'sol_migrator' || lower === 'neondb_owner' || lower.includes('owner')) {
    return {
      ok: false,
      currentUser,
      reason: `Refusing to start: DATABASE_URL role "${currentUser}" is not allowed for app/worker runtime. Use sol_app (NOBYPASSRLS, does not own tables).`,
    };
  }

  if (row.rolbypassrls) {
    return {
      ok: false,
      currentUser,
      reason: `Refusing to start: database role "${currentUser}" has rolbypassrls. App runtime must use a NOBYPASSRLS role (sol_app).`,
    };
  }

  if (row.owns_table) {
    return {
      ok: false,
      currentUser,
      reason: `Refusing to start: database role "${currentUser}" owns one or more public tables. App runtime must not own schema objects.`,
    };
  }

  if (row.member_of_owner) {
    return {
      ok: false,
      currentUser,
      reason: `Refusing to start: database role "${currentUser}" is a MEMBER of table owner role "${row.owner_role ?? 'unknown'}". App runtime must not inherit owner privileges.`,
    };
  }

  return {
    ok: true,
    currentUser,
    rolbypassrls: false,
  };
}
