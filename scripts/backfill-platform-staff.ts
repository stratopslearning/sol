/**
 * Backfill users.platform_staff from legacy users.role = 'ADMIN' and verify.
 *
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/backfill-platform-staff.ts          # dry run (report)
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/backfill-platform-staff.ts --apply  # perform backfill
 *
 * Exit 1 if any legacy ADMIN still lacks platform_staff after the run.
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';

async function main() {
  const target = assertDevDatabaseOrExit({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });
  const apply = process.argv.includes('--apply');

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: target.url });
  try {
    const before = await pool.query<{ admins: string; staff: string; missing: string }>(
      `SELECT
         count(*) FILTER (WHERE role = 'ADMIN')                              AS admins,
         count(*) FILTER (WHERE platform_staff)                              AS staff,
         count(*) FILTER (WHERE role = 'ADMIN' AND NOT platform_staff)       AS missing
       FROM users`,
    );
    const b = before.rows[0]!;
    console.log(
      `[platform-staff] ${target.host}/${target.database} admins=${b.admins} platform_staff=${b.staff} missing=${b.missing}`,
    );

    if (apply && Number(b.missing) > 0) {
      const res = await pool.query(
        `UPDATE users SET platform_staff = true, updated_at = now()
         WHERE role = 'ADMIN' AND platform_staff = false`,
      );
      console.log(`[apply] backfilled ${res.rowCount} users`);
    }

    const after = await pool.query<{ missing: string }>(
      `SELECT count(*) AS missing FROM users WHERE role = 'ADMIN' AND NOT platform_staff`,
    );
    const missing = Number(after.rows[0]!.missing);
    if (missing > 0) {
      console.error(`FAIL: ${missing} legacy ADMIN users still lack platform_staff`);
      process.exitCode = 1;
    } else {
      console.log('OK: every legacy ADMIN has platform_staff = true');
    }
  } finally {
    await pool.end();
  }
}

void main();
