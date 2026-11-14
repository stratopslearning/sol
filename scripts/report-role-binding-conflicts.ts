/**
 * Report (and optionally auto-resolve) role_bindings conflicts before 0043.
 *
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/report-role-binding-conflicts.ts          # report only
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/report-role-binding-conflicts.ts --apply  # revoke strict-superset dupes
 *
 * Exit code: 0 when clean (or fully auto-resolved with --apply);
 *            1 when any invalid (role, scope_type) pair or non-superset conflict remains.
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });
if (process.env.WAVE_DATABASE_URL?.trim()) {
  process.env.DATABASE_MIGRATE_URL = process.env.WAVE_DATABASE_URL.trim();
}
if (process.env.WAVE_DEV_DB_HOSTS?.trim()) {
  const extra = process.env.WAVE_DEV_DB_HOSTS.trim();
  process.env.DEV_DB_HOSTS = [process.env.DEV_DB_HOSTS, extra]
    .filter(Boolean)
    .join(',');
}

import {
  analyzeBindingConflicts,
  formatConflictReport,
  reportHasBlockingIssues,
  type BindingRow,
} from '../lib/authz/bindingConflicts';
import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';

async function main() {
  const target = assertDevDatabaseOrExit({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });
  const apply = process.argv.includes('--apply');

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: target.url });
  try {
    const { rows } = await pool.query<{
      id: string;
      tenant_id: string;
      user_id: string;
      scope_type: string;
      scope_id: string;
      role: string;
    }>(
      `SELECT id, tenant_id, user_id, scope_type, scope_id, role
       FROM role_bindings WHERE revoked_at IS NULL`,
    );
    const bindings: BindingRow[] = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      userId: r.user_id,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
      role: r.role,
    }));

    const report = analyzeBindingConflicts(bindings);
    console.log(`[role-binding-conflicts] ${target.host}/${target.database}`);
    console.log(`active bindings scanned: ${bindings.length}`);
    console.log(formatConflictReport(report));

    if (apply && report.autoResolvable.length > 0) {
      const ids = report.autoResolvable.flatMap((g) => g.revoke.map((r) => r.id));
      await pool.query(
        `UPDATE role_bindings SET revoked_at = now()
         WHERE id = ANY($1::uuid[]) AND revoked_at IS NULL`,
        [ids],
      );
      console.log(`[apply] revoked ${ids.length} subsumed bindings`);
    } else if (report.autoResolvable.length > 0) {
      console.log('(re-run with --apply to revoke subsumed bindings)');
    }

    const blocking = reportHasBlockingIssues(report);
    const remainingAuto = !apply && report.autoResolvable.length > 0;
    if (blocking) {
      console.error('BLOCKING: resolve invalid pairs / non-superset conflicts manually.');
      process.exitCode = 1;
    } else if (remainingAuto) {
      process.exitCode = 0;
    }
  } finally {
    await pool.end();
  }
}

void main();
