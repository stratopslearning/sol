import { createHash } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  knowledgeConnectors,
  knowledgeDocuments,
  knowledgeDocumentVersions,
  knowledgeSyncRuns,
} from '@/app/db/schema';
import { getConnectorAdapter } from '@/lib/knowledge/connectors/index';
import type { KnowledgeProvider } from '@/lib/knowledge/connectors/types';
import { scheduleKnowledgeDocumentProcess } from '@/lib/knowledge/scheduleDocumentProcess';
import {
  buildKnowledgeS3Key,
  isS3Configured,
  putMaterialObject,
} from '@/lib/knowledge/storage';
import {
  decryptSecretJson,
  encryptSecretJson,
  type OAuthTokenBundle,
} from '@/lib/knowledge/tokens';

/**
 * Run a full/delta sync for one connector into the workspace knowledge library.
 */
export async function syncConnector(connectorId: string): Promise<void> {
  const connector = await db.query.knowledgeConnectors.findFirst({
    where: and(
      eq(knowledgeConnectors.id, connectorId),
      isNull(knowledgeConnectors.deletedAt),
    ),
  });
  if (!connector) throw new Error('Connector not found');
  if (!connector.encryptedTokens) {
    throw new Error('Connector is not authenticated');
  }

  const adapter = getConnectorAdapter(
    connector.provider as KnowledgeProvider,
  );
  let tokens = decryptSecretJson<OAuthTokenBundle>(connector.encryptedTokens);

  if (
    tokens.expiresAt &&
    tokens.expiresAt < Date.now() + 60_000 &&
    adapter.refreshTokens
  ) {
    tokens = await adapter.refreshTokens(tokens);
    await db
      .update(knowledgeConnectors)
      .set({
        encryptedTokens: encryptSecretJson(tokens),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeConnectors.id, connectorId));
  }

  const [run] = await db
    .insert(knowledgeSyncRuns)
    .values({
      connectorId,
      workspaceId: connector.workspaceId,
      tenantId: connector.tenantId ?? connector.workspaceId,
      status: 'running',
    })
    .returning();

  await db
    .update(knowledgeConnectors)
    .set({ status: 'syncing', errorMessage: null, updatedAt: new Date() })
    .where(eq(knowledgeConnectors.id, connectorId));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const config = (connector.config ?? {}) as Record<string, unknown>;
  let cursor =
    typeof config.syncCursor === 'string' ? config.syncCursor : null;

  try {
    // Cap pages to avoid runaway jobs
    for (let page = 0; page < 20; page++) {
      const delta = await adapter.listDelta({ tokens, config, cursor });
      for (const file of delta.files) {
        try {
          const existing = await db.query.knowledgeDocuments.findFirst({
            where: and(
              eq(knowledgeDocuments.workspaceId, connector.workspaceId),
              eq(knowledgeDocuments.connectorId, connectorId),
              eq(knowledgeDocuments.externalId, file.externalId),
              isNull(knowledgeDocuments.deletedAt),
            ),
          });

          if (
            existing?.currentVersionId &&
            file.checksum &&
            existing.status === 'READY'
          ) {
            const ver = await db.query.knowledgeDocumentVersions.findFirst({
              where: eq(
                knowledgeDocumentVersions.id,
                existing.currentVersionId,
              ),
            });
            if (ver?.checksum === file.checksum) {
              skipped += 1;
              continue;
            }
          }

          const fetched = await adapter.fetchFile({ tokens, file });
          let s3Key: string | null = null;
          let mimeType = fetched.mimeType ?? file.mimeType ?? 'text/plain';
          let byteSize = file.byteSize ?? null;
          let checksum = file.checksum ?? null;

          if (fetched.buffer && isS3Configured()) {
            const docId = existing?.id ?? crypto.randomUUID();
            const versionNum = existing
              ? (await db.query.knowledgeDocumentVersions.findMany({
                  where: eq(knowledgeDocumentVersions.documentId, existing.id),
                })).length + 1
              : 1;
            s3Key = buildKnowledgeS3Key(
              connector.workspaceId,
              docId,
              versionNum,
              file.title.replace(/[^\w.-]+/g, '_').slice(0, 120) || 'file.bin',
            );
            await putMaterialObject({
              key: s3Key,
              body: fetched.buffer,
              contentType: mimeType,
            });
            byteSize = fetched.buffer.byteLength;
            checksum =
              checksum ??
              createHash('sha256').update(fetched.buffer).digest('hex');

            if (!existing) {
              const [doc] = await db
                .insert(knowledgeDocuments)
                .values({
                  id: docId,
                  workspaceId: connector.workspaceId,
                  tenantId: connector.workspaceId,
                  title: file.title.slice(0, 300),
                  sourceKind: 'CONNECTOR',
                  mimeType,
                  byteSize,
                  connectorId,
                  externalId: file.externalId,
                  externalPath: file.path ?? null,
                  status: 'PENDING',
                  visibility: 'workspace',
                  createdByUserId: connector.createdByUserId,
                })
                .returning();
              const [version] = await db
                .insert(knowledgeDocumentVersions)
                .values({
                  tenantId: connector.tenantId ?? connector.workspaceId,
                  documentId: doc!.id,
                  version: 1,
                  s3Key,
                  checksum,
                  byteSize,
                  mimeType,
                  createdByUserId: connector.createdByUserId,
                })
                .returning();
              await db
                .update(knowledgeDocuments)
                .set({
                  currentVersionId: version!.id,
                  updatedAt: new Date(),
                })
                .where(eq(knowledgeDocuments.id, doc!.id));
              scheduleKnowledgeDocumentProcess(doc!.id, connector.workspaceId);
              created += 1;
            } else {
              const versionNum =
                (
                  await db.query.knowledgeDocumentVersions.findMany({
                    where: eq(
                      knowledgeDocumentVersions.documentId,
                      existing.id,
                    ),
                  })
                ).length + 1;
              const [version] = await db
                .insert(knowledgeDocumentVersions)
                .values({
                  tenantId: connector.tenantId ?? connector.workspaceId,
                  documentId: existing.id,
                  version: versionNum,
                  s3Key,
                  checksum,
                  byteSize,
                  mimeType,
                  createdByUserId: connector.createdByUserId,
                })
                .returning();
              await db
                .update(knowledgeDocuments)
                .set({
                  title: file.title.slice(0, 300),
                  currentVersionId: version!.id,
                  mimeType,
                  byteSize,
                  status: 'PENDING',
                  errorMessage: null,
                  updatedAt: new Date(),
                })
                .where(eq(knowledgeDocuments.id, existing.id));
              const { notifyLinkedCoursesOfNewVersion } = await import(
                '@/lib/knowledge/linkVersions'
              );
              await notifyLinkedCoursesOfNewVersion(existing.id, version!.id);
              scheduleKnowledgeDocumentProcess(
                existing.id,
                connector.workspaceId,
              );
              updated += 1;
            }
          } else if (fetched.text) {
            // Store text as markdown upload in S3 when possible; else URL-less text version
            const textBuf = Buffer.from(fetched.text, 'utf8');
            checksum =
              checksum ?? createHash('sha256').update(textBuf).digest('hex');
            mimeType = 'text/markdown';
            byteSize = textBuf.byteLength;

            if (!existing) {
              const [doc] = await db
                .insert(knowledgeDocuments)
                .values({
                  workspaceId: connector.workspaceId,
                  tenantId: connector.workspaceId,
                  title: file.title.slice(0, 300),
                  sourceKind: 'CONNECTOR',
                  mimeType,
                  byteSize,
                  connectorId,
                  externalId: file.externalId,
                  externalPath: file.path ?? null,
                  status: 'PENDING',
                  visibility: 'workspace',
                  createdByUserId: connector.createdByUserId,
                })
                .returning();
              let key: string | null = null;
              if (isS3Configured()) {
                key = buildKnowledgeS3Key(
                  connector.workspaceId,
                  doc!.id,
                  1,
                  `${file.title.slice(0, 80)}.md`,
                );
                await putMaterialObject({
                  key,
                  body: textBuf,
                  contentType: 'text/markdown',
                });
              }
              const [version] = await db
                .insert(knowledgeDocumentVersions)
                .values({
                  tenantId: connector.tenantId ?? connector.workspaceId,
                  documentId: doc!.id,
                  version: 1,
                  s3Key: key,
                  checksum,
                  byteSize,
                  mimeType,
                  charCount: fetched.text.length,
                  createdByUserId: connector.createdByUserId,
                })
                .returning();
              await db
                .update(knowledgeDocuments)
                .set({
                  currentVersionId: version!.id,
                  updatedAt: new Date(),
                })
                .where(eq(knowledgeDocuments.id, doc!.id));
              // If no S3, process inline from text by writing a temp data URL — skip: require S3
              if (key) {
                scheduleKnowledgeDocumentProcess(doc!.id, connector.workspaceId);
              }
              created += 1;
            } else {
              skipped += 1;
            }
          } else {
            errors += 1;
          }
        } catch (err) {
          console.warn('[syncConnector] file failed', file.externalId, err);
          errors += 1;
        }
      }

      cursor = delta.cursor ?? null;
      if (!delta.cursor) break;
    }

    await db
      .update(knowledgeConnectors)
      .set({
        status: 'connected',
        lastSyncAt: new Date(),
        config: { ...config, syncCursor: cursor },
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeConnectors.id, connectorId));

    await db
      .update(knowledgeSyncRuns)
      .set({
        status: 'succeeded',
        finishedAt: new Date(),
        createdCount: created,
        updatedCount: updated,
        skippedCount: skipped,
        errorCount: errors,
      })
      .where(eq(knowledgeSyncRuns.id, run!.id));
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : 'Sync failed';
    await db
      .update(knowledgeConnectors)
      .set({
        status: 'error',
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeConnectors.id, connectorId));
    await db
      .update(knowledgeSyncRuns)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        createdCount: created,
        updatedCount: updated,
        skippedCount: skipped,
        errorCount: errors + 1,
        errorMessage: message,
      })
      .where(eq(knowledgeSyncRuns.id, run!.id));
    throw err;
  }
}
