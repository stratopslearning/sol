import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  knowledgeConnectors,
  knowledgeSyncRuns,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import type { UserData } from '@/lib/getOrCreateUser';
import { getConnectorAdapter } from '@/lib/knowledge/connectors/index';
import type { KnowledgeProvider } from '@/lib/knowledge/connectors/types';
import { enqueueConnectorSync } from '@/lib/jobs/enqueue';
import {
  encryptSecretJson,
  type OAuthTokenBundle,
} from '@/lib/knowledge/tokens';
import {
  assertWorkspaceFaculty,
  assertWorkspaceLibraryAdmin,
} from '@/lib/knowledge/workspaceAccess';

type AuthUser = Pick<UserData, 'id' | 'platformStaff' | 'clerkId'>;

export type ConnectorSummary = {
  id: string;
  workspaceId: string;
  provider: KnowledgeProvider;
  displayName: string | null;
  status: string;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

function toSummary(
  row: typeof knowledgeConnectors.$inferSelect,
): ConnectorSummary {
  const { encryptedTokens: _t, ...rest } = row;
  void _t;
  return {
    id: rest.id,
    workspaceId: rest.workspaceId,
    provider: rest.provider as KnowledgeProvider,
    displayName: rest.displayName,
    status: rest.status,
    lastSyncAt: rest.lastSyncAt,
    errorMessage: rest.errorMessage,
    config: (rest.config ?? {}) as Record<string, unknown>,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
  };
}

export async function listWorkspaceConnectors(
  user: AuthUser,
  workspaceId: string,
): Promise<ConnectorSummary[]> {
  await assertWorkspaceFaculty(user, workspaceId);
  const rows = await db.query.knowledgeConnectors.findMany({
    where: and(
      eq(knowledgeConnectors.workspaceId, workspaceId),
      isNull(knowledgeConnectors.deletedAt),
    ),
    orderBy: [desc(knowledgeConnectors.updatedAt)],
  });
  return rows.map(toSummary);
}

export async function upsertConnectorDraft(
  user: AuthUser,
  opts: {
    workspaceId: string;
    provider: KnowledgeProvider;
    displayName?: string;
    config?: Record<string, unknown>;
  },
): Promise<ConnectorSummary> {
  await assertWorkspaceLibraryAdmin(user, opts.workspaceId);
  const { upsertKnowledgeConnectorDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  const row = await upsertKnowledgeConnectorDefiner({
    workspaceId: opts.workspaceId,
    provider: opts.provider,
    displayName:
      opts.displayName ?? getConnectorAdapter(opts.provider).displayName,
    config: opts.config ?? {},
    createdByUserId: user.id,
  });
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    provider: String(row.provider) as KnowledgeProvider,
    displayName: (row.displayName as string | null) ?? null,
    status: String(row.status),
    lastSyncAt: row.lastSyncAt
      ? new Date(String(row.lastSyncAt))
      : null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    config: (row.config as Record<string, unknown>) ?? {},
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
  };
}

export function buildConnectorAuthorizeUrl(opts: {
  provider: KnowledgeProvider;
  workspaceId: string;
  connectorId: string;
  redirectUri: string;
}): string {
  const adapter = getConnectorAdapter(opts.provider);
  const state = Buffer.from(
    JSON.stringify({
      workspaceId: opts.workspaceId,
      connectorId: opts.connectorId,
      provider: opts.provider,
    }),
  ).toString('base64url');
  return adapter.getAuthorizeUrl({
    workspaceId: opts.workspaceId,
    state,
    redirectUri: opts.redirectUri,
  });
}

export async function completeConnectorOAuth(opts: {
  code: string;
  state: string;
  redirectUri: string;
}): Promise<{ workspaceId: string; connectorId: string }> {
  let parsed: {
    workspaceId: string;
    connectorId: string;
    provider: KnowledgeProvider;
  };
  try {
    parsed = JSON.parse(
      Buffer.from(opts.state, 'base64url').toString('utf8'),
    ) as typeof parsed;
  } catch {
    throw ApiError.badRequest('Invalid OAuth state');
  }

  const adapter = getConnectorAdapter(parsed.provider);
  const tokens = await adapter.exchangeCode({
    code: opts.code,
    redirectUri: opts.redirectUri,
  });

  const { updateKnowledgeConnectorDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  await updateKnowledgeConnectorDefiner({
    connectorId: parsed.connectorId,
    encryptedTokens: encryptSecretJson(tokens satisfies OAuthTokenBundle),
    scopes: tokens.scope ?? null,
    status: 'connected',
    errorMessage: null,
  });

  return {
    workspaceId: parsed.workspaceId,
    connectorId: parsed.connectorId,
  };
}

export async function updateConnectorConfig(
  user: AuthUser,
  connectorId: string,
  config: Record<string, unknown>,
): Promise<ConnectorSummary> {
  const row = await db.query.knowledgeConnectors.findFirst({
    where: and(
      eq(knowledgeConnectors.id, connectorId),
      isNull(knowledgeConnectors.deletedAt),
    ),
  });
  if (!row) throw ApiError.notFound('Connector not found');
  await assertWorkspaceLibraryAdmin(user, row.workspaceId);
  const { updateKnowledgeConnectorDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  const updated = await updateKnowledgeConnectorDefiner({
    connectorId,
    config: { ...(row.config ?? {}), ...config },
  });
  return {
    id: String(updated.id),
    workspaceId: String(updated.workspaceId),
    provider: String(updated.provider) as KnowledgeProvider,
    displayName: (updated.displayName as string | null) ?? null,
    status: String(updated.status),
    lastSyncAt: updated.lastSyncAt
      ? new Date(String(updated.lastSyncAt))
      : null,
    errorMessage: (updated.errorMessage as string | null) ?? null,
    config: (updated.config as Record<string, unknown>) ?? {},
    createdAt: new Date(String(updated.createdAt)),
    updatedAt: new Date(String(updated.updatedAt)),
  };
}

export async function scheduleConnectorSync(
  user: AuthUser,
  connectorId: string,
): Promise<void> {
  const row = await db.query.knowledgeConnectors.findFirst({
    where: and(
      eq(knowledgeConnectors.id, connectorId),
      isNull(knowledgeConnectors.deletedAt),
    ),
  });
  if (!row) throw ApiError.notFound('Connector not found');
  await assertWorkspaceLibraryAdmin(user, row.workspaceId);
  if (!row.encryptedTokens) {
    throw ApiError.badRequest('Connect the account before syncing');
  }
  await enqueueConnectorSync(connectorId, row.workspaceId);
}

export async function disconnectConnector(
  user: AuthUser,
  connectorId: string,
): Promise<void> {
  const row = await db.query.knowledgeConnectors.findFirst({
    where: eq(knowledgeConnectors.id, connectorId),
  });
  if (!row || row.deletedAt) throw ApiError.notFound('Connector not found');
  await assertWorkspaceLibraryAdmin(user, row.workspaceId);
  const { updateKnowledgeConnectorDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  await updateKnowledgeConnectorDefiner({
    connectorId,
    encryptedTokens: null,
    status: 'disconnected',
    deleted: true,
  });
}

export async function listRecentSyncRuns(
  user: AuthUser,
  connectorId: string,
  limit = 10,
) {
  const row = await db.query.knowledgeConnectors.findFirst({
    where: eq(knowledgeConnectors.id, connectorId),
  });
  if (!row) throw ApiError.notFound('Connector not found');
  await assertWorkspaceFaculty(user, row.workspaceId);
  return db.query.knowledgeSyncRuns.findMany({
    where: eq(knowledgeSyncRuns.connectorId, connectorId),
    orderBy: [desc(knowledgeSyncRuns.startedAt)],
    limit,
  });
}
