/**
 * One-shot backfill: populate `users.stripe_customer_id` for users that have
 * `paid = true` but no recorded customer id.
 *
 * Strategy:
 *   1. SELECT every paid user with NULL stripe_customer_id.
 *   2. For each, search Stripe for a customer whose metadata contains the
 *      user's clerkId. We use stripe.customers.search with the documented
 *      `metadata['clerkUserId']` operator. Falls back to a name+email
 *      search when metadata is empty.
 *   3. UPDATE the row when exactly one candidate is found. Logs ambiguous
 *      and missing matches without writing.
 *
 * Idempotent — safe to run repeatedly. Does not mutate Stripe.
 *
 * Run with `npm run db:backfill-stripe-customer`.
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import Stripe from 'stripe';
import ws from 'ws';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

interface UserRow {
  id: string;
  clerk_id: string;
  email: string | null;
}

async function findCustomerId(
  stripe: Stripe,
  user: UserRow,
): Promise<{ id: string; source: string } | null> {
  // 1. Metadata search — what our checkout route stamps.
  try {
    const metaSearch = await stripe.customers.search({
      query: `metadata['clerkUserId']:'${user.clerk_id}'`,
      limit: 2,
    });
    if (metaSearch.data.length === 1) {
      return { id: metaSearch.data[0].id, source: 'metadata' };
    }
    if (metaSearch.data.length > 1) {
      console.warn(
        `[ambiguous] user ${user.id} (${user.email}) matches ${metaSearch.data.length} Stripe customers via metadata. Skipping.`,
      );
      return null;
    }
  } catch (err) {
    console.warn(`[warn] metadata search failed for ${user.email}:`, err);
  }

  // 2. Email fallback (only if email exists).
  if (user.email) {
    try {
      const emailSearch = await stripe.customers.list({
        email: user.email,
        limit: 2,
      });
      if (emailSearch.data.length === 1) {
        return { id: emailSearch.data[0].id, source: 'email' };
      }
      if (emailSearch.data.length > 1) {
        console.warn(
          `[ambiguous] user ${user.id} (${user.email}) matches multiple Stripe customers by email. Skipping.`,
        );
        return null;
      }
    } catch (err) {
      console.warn(`[warn] email search failed for ${user.email}:`, err);
    }
  }
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, clerk_id, email
       FROM users
       WHERE paid = true AND stripe_customer_id IS NULL`,
    );
    console.log(`Found ${rows.length} paid users without stripe_customer_id.`);

    let resolved = 0;
    let ambiguous = 0;
    let missing = 0;
    for (const user of rows) {
      const match = await findCustomerId(stripe, user);
      if (!match) {
        if (!user.email) {
          missing++;
          console.warn(`[skip] user ${user.id} has no email; cannot fall back.`);
          continue;
        }
        missing++;
        console.warn(`[miss] user ${user.id} (${user.email}): no Stripe customer found.`);
        continue;
      }
      try {
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1, last_synced_at = now() WHERE id = $2',
          [match.id, user.id],
        );
        resolved++;
        console.log(`[ok] user ${user.id} -> ${match.id} (via ${match.source})`);
      } catch (err) {
        console.error(`[error] failed to update user ${user.id}:`, err);
      }
    }

    console.log(
      `\nBackfill complete: ${resolved} resolved, ${missing} unresolved/ambiguous (${ambiguous}).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('backfill-stripe-customer failed:', err);
  process.exit(1);
});
