import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeTestDb, getTestDb, type TestDb } from '../helpers/db';
import { makeUser } from '../helpers/factories';
import { workspaces, workspaceLicenses, roleBindings } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

const skip = !process.env.TEST_DATABASE_URL;

describe.skipIf(skip)('wf.onboarding.provision', () => {
  let db: TestDb;
  const cleanupWs: string[] = [];
  const cleanupUsers: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
    (globalThis as { __neonPool__?: unknown }).__neonPool__ = undefined;
    db = getTestDb();
  });

  afterAll(async () => {
    for (const id of cleanupWs) {
      await db.delete(roleBindings).where(eq(roleBindings.tenantId, id));
      await db
        .delete(workspaceLicenses)
        .where(eq(workspaceLicenses.workspaceId, id));
      await db.delete(workspaces).where(eq(workspaces.id, id));
    }
    for (const id of cleanupUsers) {
      try {
        await db
          .delete((await import('@/app/db/schema')).users)
          .where(eq((await import('@/app/db/schema')).users.id, id));
      } catch {
        // audit_log is append-only; FK SET NULL on actor_user_id is forbidden.
      }
    }
    await closeTestDb();
  });

  for (const sku of ['creator', 'department', 'institution'] as const) {
    it(`provisionWorkspace creates ${sku} with owner binding + license`, async () => {
      const owner = await makeUser(db, {
        email: `prov-${sku}-${Date.now()}@isolation.test`,
      });
      cleanupUsers.push(owner.id);

      const { provisionWorkspace } = await import('@/lib/workspace/provision');
      const slug = `prov-${sku}-${Date.now()}`.slice(0, 40);
      const result = await provisionWorkspace({
        type: sku,
        name: `Provision ${sku}`,
        slug,
        ownerUserId: owner.id,
        actorUserId: owner.id,
      });
      cleanupWs.push(result.workspace.id);

      expect(result.workspace.type).toBe(sku);
      expect(result.license).toBeTruthy();

      const binding = await db.query.roleBindings.findFirst({
        where: eq(roleBindings.userId, owner.id),
      });
      expect(binding?.role).toBe('owner');
      expect(binding?.tenantId).toBe(result.workspace.id);
      expect(binding?.scopeType).toBe('organization');
    });
  }
});
