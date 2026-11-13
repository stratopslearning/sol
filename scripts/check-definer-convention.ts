/**
 * Wave 0: assert every public sol_* SECURITY DEFINER is owned by a
 * BYPASSRLS role or pins app.tenant_id in its body.
 *
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/check-definer-convention.ts --confirm-dev-db
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

assertDevDatabaseOrExit({
  urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
});

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

async function main() {
  const url = process.env.DATABASE_MIGRATE_URL || process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query<{
      proname: string;
      owner: string;
      owner_bypass: boolean;
      pins_tenant: boolean;
    }>(`
      SELECT p.proname,
             pg_get_userbyid(p.proowner) AS owner,
             r.rolbypassrls AS owner_bypass,
             (p.prosrc ILIKE '%set_config%app.tenant_id%') AS pins_tenant
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_roles r ON r.oid = p.proowner
      WHERE n.nspname = 'public'
        AND p.prosecdef
        AND p.proname LIKE 'sol_%'
      ORDER BY 1
    `);

    const bad = rows.filter((r) => !r.owner_bypass && !r.pins_tenant);
    console.log(`Checked ${rows.length} sol_* DEFINER functions`);
    if (bad.length > 0) {
      console.error(
        'FAIL: DEFINER without BYPASSRLS owner and without tenant pin:',
      );
      for (const r of bad) {
        console.error(`  ${r.proname} owner=${r.owner}`);
      }
      process.exit(1);
    }
    console.log('OK: all DEFINERs have BYPASSRLS owner or pin app.tenant_id');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
