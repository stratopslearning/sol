import { sql } from 'drizzle-orm';

import { db } from '@/app/db';

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Run work inside a transaction with transaction-local tenant (and optional user)
 * GUCs for RLS FORCE policies (`app.tenant_id`, `app.user_id`).
 *
 * Prefer SECURITY DEFINER helpers for long/critical authoring writes — Neon
 * WebSocket sessions are flaky under Next (`bufferUtil.mask`, connection drops),
 * and HTTP fetch pooling does not keep GUCs across statements reliably.
 */
export async function withTenant<T>(
  tenantId: string,
  userId: string | null,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const check = await tx.execute(
      userId
        ? sql`
            select
              set_config('app.tenant_id', ${tenantId}, true) as tenant_set,
              set_config('app.user_id', ${userId}, true) as user_set,
              nullif(current_setting('app.tenant_id', true), '') as guc
          `
        : sql`
            select
              set_config('app.tenant_id', ${tenantId}, true) as tenant_set,
              nullif(current_setting('app.tenant_id', true), '') as guc
          `,
    );
    const rows =
      (check as unknown as { rows?: { guc: string | null }[] }).rows ??
      (Array.isArray(check) ? (check as { guc: string | null }[]) : []);
    const guc = rows[0]?.guc ?? null;
    if (guc !== tenantId) {
      throw new Error(
        `withTenant failed to pin app.tenant_id (want=${tenantId}, got=${guc ?? 'null'}). Check Neon WebSocket / pool transaction support.`,
      );
    }
    return fn(tx);
  });
}
