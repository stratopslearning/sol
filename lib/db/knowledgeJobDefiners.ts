/**
 * Knowledge job / connector / clone writes under FORCE RLS (0072).
 */
import { sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { asUuidArray } from '@/lib/db/sqlArrays';

function rowsFromExecute<T>(result: unknown): T[] {
  return (
    (result as { rows?: T[] }).rows ??
    (Array.isArray(result) ? (result as T[]) : [])
  );
}

function parseJsonb<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return JSON.parse(raw) as T;
  return raw as T;
}

export type ClaimedKnowledgeDocument = {
  id: string;
  workspaceId: string;
  tenantId: string | null;
  currentVersionId: string | null;
  sourceKind: string;
  externalUrl: string | null;
  mimeType: string | null;
  legacyMaterialId: string | null;
  status: string;
};

export async function claimKnowledgeDocumentDefiner(
  documentId: string,
): Promise<ClaimedKnowledgeDocument | null> {
  const result = await db.execute(sql`
    SELECT sol_claim_knowledge_document(${documentId}::uuid) AS row
  `);
  return parseJsonb<ClaimedKnowledgeDocument>(
    rowsFromExecute<{ row: unknown }>(result)[0]?.row,
  );
}

export async function setKnowledgeDocumentStatusDefiner(
  documentId: string,
  status: string,
  error?: string | null,
): Promise<void> {
  await db.execute(sql`
    SELECT sol_set_knowledge_document_status(
      ${documentId}::uuid,
      ${status},
      ${error ?? null}
    )
  `);
}

export async function setCourseMaterialStatusDefiner(
  materialId: string,
  status: string,
  error?: string | null,
): Promise<void> {
  await db.execute(sql`
    SELECT sol_set_course_material_status(
      ${materialId}::uuid,
      ${status},
      ${error ?? null}
    )
  `);
}

export async function supersedeKnowledgeChunksDefiner(
  documentId: string,
): Promise<void> {
  await db.execute(sql`
    SELECT sol_supersede_knowledge_chunks(${documentId}::uuid)
  `);
}

export async function insertKnowledgeChunksDefiner(payload: {
  documentId: string;
  versionId: string;
  workspaceId: string;
  tenantId?: string | null;
  chunks: Array<{
    chunkIndex: number;
    content: string;
    tokenCount: number;
    embedding: number[] | string;
  }>;
}): Promise<number> {
  const normalized = {
    ...payload,
    chunks: payload.chunks.map((c) => ({
      ...c,
      embedding: Array.isArray(c.embedding)
        ? `[${c.embedding.join(',')}]`
        : c.embedding,
    })),
  };
  const result = await db.execute(sql`
    SELECT sol_insert_knowledge_chunks(${JSON.stringify(normalized)}::jsonb) AS count
  `);
  return Number(rowsFromExecute<{ count: number }>(result)[0]?.count ?? 0);
}

export async function updateKnowledgeVersionMetaDefiner(payload: {
  versionId: string;
  ocrUsed?: boolean;
  charCount?: number;
  checksum?: string | null;
}): Promise<void> {
  await db.execute(sql`
    SELECT sol_update_knowledge_version_meta(${JSON.stringify(payload)}::jsonb)
  `);
}

export async function resetKnowledgeDocumentPendingDefiner(
  documentId: string,
  currentVersionId?: string | null,
): Promise<void> {
  await db.execute(sql`
    SELECT sol_reset_knowledge_document_pending(
      ${documentId}::uuid,
      ${currentVersionId ?? null}::uuid
    )
  `);
}

export async function cloneCourseKnowledgeLinksDefiner(payload: {
  fromCourseId: string;
  toCourseId: string;
  linkedByUserId?: string | null;
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT sol_clone_course_knowledge_links(${JSON.stringify(payload)}::jsonb) AS count
  `);
  return Number(rowsFromExecute<{ count: number }>(result)[0]?.count ?? 0);
}

export async function softDeleteMirroredKnowledgeDocsDefiner(
  materialIds: string[],
): Promise<number> {
  if (materialIds.length === 0) return 0;
  const result = await db.execute(sql`
    SELECT sol_soft_delete_mirrored_knowledge_docs(${asUuidArray(materialIds)}) AS count
  `);
  return Number(rowsFromExecute<{ count: number }>(result)[0]?.count ?? 0);
}

export async function upsertKnowledgeConnectorDefiner(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await db.execute(sql`
    SELECT sol_upsert_knowledge_connector(${JSON.stringify(payload)}::jsonb) AS row
  `);
  const parsed = parseJsonb<Record<string, unknown>>(
    rowsFromExecute<{ row: unknown }>(result)[0]?.row,
  );
  if (!parsed?.id) throw new Error('sol_upsert_knowledge_connector returned no row');
  return parsed;
}

export async function updateKnowledgeConnectorDefiner(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await db.execute(sql`
    SELECT sol_update_knowledge_connector(${JSON.stringify(payload)}::jsonb) AS row
  `);
  const parsed = parseJsonb<Record<string, unknown>>(
    rowsFromExecute<{ row: unknown }>(result)[0]?.row,
  );
  if (!parsed?.id) throw new Error('sol_update_knowledge_connector returned no row');
  return parsed;
}
