import { createHash } from 'node:crypto';

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
  const {
    fetchKnowledgeConnectorByIdDefiner,
    updateKnowledgeConnectorDefiner,
    startKnowledgeSyncRunDefiner,
    finishKnowledgeSyncRunDefiner,
    fetchKnowledgeDocByConnectorExternalDefiner,
    createConnectorKnowledgeDocumentDefiner,
    fetchKnowledgeVersionByIdDefiner,
  } = await import('@/lib/db/knowledgeJobDefiners');
  const { addKnowledgeDocumentVersionDefiner, setKnowledgeDocumentTitleDefiner } =
    await import('@/lib/db/entityScopedReads');

  const connector = await fetchKnowledgeConnectorByIdDefiner(connectorId);
  if (!connector || connector.deletedAt) throw new Error('Connector not found');
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
    await updateKnowledgeConnectorDefiner({
      connectorId,
      encryptedTokens: encryptSecretJson(tokens),
    });
  }

  const run = await startKnowledgeSyncRunDefiner({ connectorId });

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
          const existing = await fetchKnowledgeDocByConnectorExternalDefiner(
            connector.workspaceId,
            connectorId,
            file.externalId,
          );

          if (
            existing?.currentVersionId &&
            file.checksum &&
            existing.status === 'READY'
          ) {
            const ver = await fetchKnowledgeVersionByIdDefiner(
              existing.currentVersionId,
            );
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
            let versionNum = 1;
            if (existing?.currentVersionId) {
              const cur = await fetchKnowledgeVersionByIdDefiner(
                existing.currentVersionId,
              );
              versionNum = (cur?.version ?? 0) + 1;
            } else if (existing) {
              versionNum = 2;
            }
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
              await createConnectorKnowledgeDocumentDefiner({
                id: docId,
                workspaceId: connector.workspaceId,
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
              });
              await addKnowledgeDocumentVersionDefiner({
                documentId: docId,
                version: 1,
                s3Key,
                checksum,
                byteSize,
                mimeType,
                createdByUserId: connector.createdByUserId ?? connector.id,
              });
              scheduleKnowledgeDocumentProcess(docId, connector.workspaceId);
              created += 1;
            } else {
              const versionId = await addKnowledgeDocumentVersionDefiner({
                documentId: existing.id,
                version: versionNum,
                s3Key,
                checksum,
                byteSize,
                mimeType,
                createdByUserId: connector.createdByUserId ?? connector.id,
              });
              await setKnowledgeDocumentTitleDefiner(
                existing.id,
                file.title.slice(0, 300),
              );
              const { notifyLinkedCoursesOfNewVersion } = await import(
                '@/lib/knowledge/linkVersions'
              );
              await notifyLinkedCoursesOfNewVersion(existing.id, versionId);
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
              const doc = await createConnectorKnowledgeDocumentDefiner({
                workspaceId: connector.workspaceId,
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
              });
              let key: string | null = null;
              if (isS3Configured()) {
                key = buildKnowledgeS3Key(
                  connector.workspaceId,
                  doc.id,
                  1,
                  `${file.title.slice(0, 80)}.md`,
                );
                await putMaterialObject({
                  key,
                  body: textBuf,
                  contentType: 'text/markdown',
                });
              }
              await addKnowledgeDocumentVersionDefiner({
                documentId: doc.id,
                version: 1,
                s3Key: key,
                checksum,
                byteSize,
                mimeType,
                createdByUserId: connector.createdByUserId ?? connector.id,
              });
              if (key) {
                scheduleKnowledgeDocumentProcess(doc.id, connector.workspaceId);
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

    await finishKnowledgeSyncRunDefiner({
      runId: run.id,
      connectorId,
      status: 'succeeded',
      createdCount: created,
      updatedCount: updated,
      skippedCount: skipped,
      errorCount: errors,
      config: { ...config, syncCursor: cursor },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : 'Sync failed';
    await finishKnowledgeSyncRunDefiner({
      runId: run.id,
      connectorId,
      status: 'failed',
      createdCount: created,
      updatedCount: updated,
      skippedCount: skipped,
      errorCount: errors + 1,
      errorMessage: message,
    });
    throw err;
  }
}
