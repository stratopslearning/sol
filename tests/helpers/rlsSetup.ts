import fs from 'node:fs';
import path from 'node:path';

import type { PoolClient } from 'pg';

import type { TestDb } from './db';

const MIGRATION_0036 = path.join(
  process.cwd(),
  'drizzle',
  '0036_rls_shadow.sql',
);

export async function tableHasRls(
  client: PoolClient,
  tableName: string,
): Promise<boolean> {
  const { rows } = await client.query<{ relrowsecurity: boolean }>(
    `SELECT c.relrowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = $1`,
    [tableName],
  );
  return rows[0]?.relrowsecurity === true;
}

export async function solAppRoleExists(client: PoolClient): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') AS exists`,
  );
  return rows[0]?.exists === true;
}

/** Apply 0036 RLS shadow policies when missing (idempotent SQL file). */
export async function ensureRlsShadowPolicies(db: TestDb): Promise<void> {
  const client = await db.$client.connect();
  try {
    const needsCourses = !(await tableHasRls(client, 'courses'));
    const needsAttempts = !(await tableHasRls(client, 'attempts'));
    if (!needsCourses && !needsAttempts) return;

    const sql = fs.readFileSync(MIGRATION_0036, 'utf8');
    await client.query(sql);
  } finally {
    client.release();
  }
}

export type TenantGucQueryResult<T> = {
  rows: T[];
};

/**
 * Run a callback inside a transaction with app.tenant_id set.
 * Uses SET LOCAL ROLE sol_app when the role exists and the session may assume it.
 */
export async function withTenantGuc<T>(
  db: TestDb,
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.$client.connect();
  try {
    await client.query('BEGIN');
    const hasSolApp = await solAppRoleExists(client);
    if (!hasSolApp) {
      throw new Error(
        'sol_app role missing — apply drizzle/0034_app_roles on this branch',
      );
    }
    // Owner roles often have BYPASSRLS; must SET ROLE sol_app for FORCE RLS to apply.
    await client.query('SET LOCAL ROLE sol_app');
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [
      tenantId,
    ]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* already aborted */
    }
    throw err;
  } finally {
    client.release();
  }
}
