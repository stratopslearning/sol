/**
 * Copy S3 objects to tenants/{tenantId}/…, update DB keys, verify Get, then
 * optionally delete old keys (CONFIRM_DELETE_OLD_S3=1).
 *
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/migrate-s3-tenant-keys.ts
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';

async function main() {
  assertDevDatabaseOrExit({
    urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'],
  });

  console.log(
    '[migrate-s3] Inventory interactives + materials without tenants/ prefix; copy → update DB → verify → delete only if CONFIRM_DELETE_OLD_S3=1',
  );
  console.log(
    '[migrate-s3] Stub complete for Wave 1 scaffolding — run against synthetic keys in a follow-up with AWS credentials.',
  );
  // Full copy/update/delete loop lands with AWS_S3_BUCKET + ListObjects; keep
  // gated so shared buckets are never wiped accidentally.
  if (process.env.CONFIRM_DELETE_OLD_S3 === '1') {
    console.log('[migrate-s3] delete phase requested but no verified copies yet — noop');
  }
}

void main();
