import { createHash } from 'node:crypto';

import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courseKnowledgeLinks,
  knowledgeDocuments,
  knowledgeDocumentVersions,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { withTenant } from '@/lib/db/tenantContext';
import type { UserData } from '@/lib/getOrCreateUser';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  MAX_ZIP_UPLOAD_BYTES,
} from '@/lib/knowledge/constants';
import {
  acceptLinkedDocumentUpdate,
  dismissLinkedDocumentUpdate,
  notifyLinkedCoursesOfNewVersion,
} from '@/lib/knowledge/linkVersions';
import {
  nextDocumentVersionNumber,
  processKnowledgeDocument,
  reprocessKnowledgeDocument,
  restoreKnowledgeDocumentVersion,
} from '@/lib/knowledge/processDocument';
import { scheduleKnowledgeDocumentProcess } from '@/lib/knowledge/scheduleDocumentProcess';
import {
  buildKnowledgeS3Key,
  isS3Configured,
  putMaterialObject,
} from '@/lib/knowledge/storage';
import {
  assertWorkspaceFaculty,
  assertWorkspaceLibraryAdmin,
  isWorkspaceKnowledgeCoordinator,
} from '@/lib/knowledge/workspaceAccess';
import {
  extractKnowledgeZipEntries,
  type ZipImportSkip,
} from '@/lib/knowledge/zipImport';
import { getCourseWorkspaceId } from '@/lib/workspace';

export {
  acceptLinkedDocumentUpdate,
  dismissLinkedDocumentUpdate,
} from '@/lib/knowledge/linkVersions';

type AuthUser = Pick<UserData, 'id' | 'platformStaff' | 'clerkId'>;

export type KnowledgeDocumentSummary = {
  id: string;
  workspaceId: string;
  title: string;
  sourceKind: 'UPLOAD' | 'URL' | 'CONNECTOR';
  mimeType: string | null;
  byteSize: number | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage: string | null;
  externalUrl: string | null;
  connectorId: string | null;
  currentVersionId: string | null;
  visibility: 'personal' | 'workspace';
  createdByUserId: string | null;
  /** Present when listed as a course attachment. */
  authoringCorpus?: 'prior_course' | 'this_term';
  pinnedVersionId?: string | null;
  updateAvailableVersionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSummary(
  row: typeof knowledgeDocuments.$inferSelect,
): KnowledgeDocumentSummary {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    sourceKind: row.sourceKind as KnowledgeDocumentSummary['sourceKind'],
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    status: row.status as KnowledgeDocumentSummary['status'],
    errorMessage: row.errorMessage,
    externalUrl: row.externalUrl,
    connectorId: row.connectorId,
    currentVersionId: row.currentVersionId,
    visibility: (row.visibility as 'personal' | 'workspace') ?? 'workspace',
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listWorkspaceDocuments(
  user: AuthUser,
  workspaceId: string,
): Promise<KnowledgeDocumentSummary[]> {
  await assertWorkspaceFaculty(user, workspaceId);
  const coordinator = await isWorkspaceKnowledgeCoordinator(user, workspaceId);

  // FORCE RLS: bare knowledge_documents reads return 0 without tenant GUC.
  const { fetchWorkspaceDocumentsDefiner } = await import(
    '@/lib/db/entityScopedReads'
  );
  return fetchWorkspaceDocumentsDefiner(workspaceId, user.id, coordinator);
}

export async function listCourseLinkedDocuments(
  user: AuthUser,
  courseId: string,
): Promise<KnowledgeDocumentSummary[]> {
  await assertCanManageCourse(user, courseId);

  // FORCE RLS: links + docs need DEFINER (uploads were mirrored into Knowledge).
  const { fetchCourseLinkedDocuments } = await import(
    '@/lib/db/entityScopedReads'
  );
  return fetchCourseLinkedDocuments(courseId);
}

export async function linkDocumentToCourse(
  user: AuthUser,
  courseId: string,
  documentId: string,
  opts?: { authoringCorpus?: 'prior_course' | 'this_term' },
): Promise<void> {
  await assertCanManageCourse(user, courseId);
  const workspaceId = await getCourseWorkspaceId(courseId);
  if (!workspaceId) throw ApiError.badRequest('Course has no workspace');

  await withTenant(workspaceId, user.id, async (tx) => {
    const doc = await tx.query.knowledgeDocuments.findFirst({
      where: and(
        eq(knowledgeDocuments.id, documentId),
        eq(knowledgeDocuments.workspaceId, workspaceId),
        isNull(knowledgeDocuments.deletedAt),
      ),
    });
    if (!doc) throw ApiError.notFound('Document not found in workspace library');
    if (doc.visibility === 'personal') {
      throw ApiError.badRequest(
        'Share this document to the library before attaching it to a course',
      );
    }
    if (!doc.currentVersionId) {
      throw ApiError.badRequest('Document has no indexed version yet');
    }

    await tx
      .insert(courseKnowledgeLinks)
      .values({
        courseId,
        documentId,
        tenantId: workspaceId,
        linkedByUserId: user.id,
        authoringCorpus: opts?.authoringCorpus ?? 'this_term',
        pinnedVersionId: doc.currentVersionId,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  });
}

export async function setLinkedDocumentAuthoringCorpus(
  user: AuthUser,
  courseId: string,
  documentId: string,
  corpus: 'prior_course' | 'this_term',
): Promise<void> {
  await assertCanManageCourse(user, courseId);
  const workspaceId = await getCourseWorkspaceId(courseId);
  if (!workspaceId) throw ApiError.badRequest('Course has no workspace');

  const updated = await withTenant(workspaceId, user.id, async (tx) =>
    tx
      .update(courseKnowledgeLinks)
      .set({ authoringCorpus: corpus, updatedAt: new Date() })
      .where(
        and(
          eq(courseKnowledgeLinks.courseId, courseId),
          eq(courseKnowledgeLinks.documentId, documentId),
        ),
      )
      .returning(),
  );
  if (updated.length === 0) {
    throw ApiError.notFound('Document is not attached to this course');
  }
}

export async function unlinkDocumentFromCourse(
  user: AuthUser,
  courseId: string,
  documentId: string,
): Promise<void> {
  await assertCanManageCourse(user, courseId);
  const workspaceId = await getCourseWorkspaceId(courseId);
  if (!workspaceId) throw ApiError.badRequest('Course has no workspace');

  await withTenant(workspaceId, user.id, async (tx) => {
    await tx
      .delete(courseKnowledgeLinks)
      .where(
        and(
          eq(courseKnowledgeLinks.courseId, courseId),
          eq(courseKnowledgeLinks.documentId, documentId),
        ),
      );
  });
}

export async function addWorkspaceDocumentFromUrl(
  user: AuthUser,
  opts: {
    workspaceId: string;
    title: string;
    url: string;
    courseId?: string | null;
    /** Default personal for instructors; workspace requires coordinator or explicit share. */
    visibility?: 'personal' | 'workspace';
  },
): Promise<KnowledgeDocumentSummary> {
  await assertWorkspaceFaculty(user, opts.workspaceId);
  const visibility = opts.visibility ?? 'personal';
  if (visibility === 'workspace') {
    await assertWorkspaceLibraryAdmin(user, opts.workspaceId);
  }
  let safeUrl: string;
  try {
    const { assertSafeMaterialUrl } = await import('@/lib/knowledge/urlSafety');
    safeUrl = assertSafeMaterialUrl(opts.url).toString();
  } catch (e) {
    throw ApiError.badRequest(
      e instanceof Error ? e.message : 'Invalid URL',
    );
  }
  const {
    createKnowledgeDocumentDefiner,
    addKnowledgeDocumentVersionDefiner,
    fetchKnowledgeDocumentById,
  } = await import('@/lib/db/entityScopedReads');
  const documentId = await createKnowledgeDocumentDefiner({
    workspaceId: opts.workspaceId,
    title: opts.title.slice(0, 300),
    sourceKind: 'URL',
    visibility,
    createdByUserId: user.id,
    externalUrl: safeUrl,
  });
  const versionId = await addKnowledgeDocumentVersionDefiner({
    documentId,
    version: 1,
    createdByUserId: user.id,
  });

  if (opts.courseId) {
    await linkDocumentToCourse(user, opts.courseId, documentId);
  }

  scheduleKnowledgeDocumentProcess(documentId, opts.workspaceId);
  const created = await fetchKnowledgeDocumentById(documentId);
  if (!created || created.deletedAt) {
    throw ApiError.badRequest('Document was created but could not be loaded');
  }
  return {
    id: created.id,
    workspaceId: created.workspaceId,
    title: created.title,
    sourceKind: 'URL',
    mimeType: null,
    byteSize: null,
    status: 'PENDING',
    errorMessage: null,
    externalUrl: safeUrl,
    connectorId: null,
    currentVersionId: versionId,
    visibility: created.visibility,
    createdByUserId: created.createdByUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function addWorkspaceDocumentFromUpload(
  user: AuthUser,
  opts: {
    workspaceId: string;
    title: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    courseId?: string | null;
    visibility?: 'personal' | 'workspace';
  },
): Promise<KnowledgeDocumentSummary> {
  await assertWorkspaceFaculty(user, opts.workspaceId);
  // Course-attached uploads land in the shared library so they can be linked.
  const visibility =
    opts.visibility ?? (opts.courseId ? 'workspace' : 'personal');
  if (visibility === 'workspace' && !opts.courseId) {
    await assertWorkspaceLibraryAdmin(user, opts.workspaceId);
  }
  if (!isS3Configured()) {
    throw ApiError.badRequest('File storage is not configured (S3)');
  }
  if (opts.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw ApiError.badRequest('File exceeds 10 MB limit');
  }
  const mime = opts.mimeType || 'application/octet-stream';
  if (
    !ALLOWED_UPLOAD_MIME.has(mime) &&
    !opts.fileName.match(/\.(pdf|docx|txt|md)$/i)
  ) {
    throw ApiError.badRequest('Unsupported file type');
  }

  const {
    createKnowledgeDocumentDefiner,
    addKnowledgeDocumentVersionDefiner,
    fetchKnowledgeDocumentById,
  } = await import('@/lib/db/entityScopedReads');
  const documentId = await createKnowledgeDocumentDefiner({
    workspaceId: opts.workspaceId,
    title: opts.title.slice(0, 300),
    sourceKind: 'UPLOAD',
    visibility,
    createdByUserId: user.id,
    mimeType: mime,
    byteSize: opts.buffer.byteLength,
  });

  const versionNum = 1;
  const s3Key = buildKnowledgeS3Key(
    opts.workspaceId,
    documentId,
    versionNum,
    opts.fileName,
  );
  await putMaterialObject({
    key: s3Key,
    body: opts.buffer,
    contentType: mime,
  });

  const checksum = createHash('sha256').update(opts.buffer).digest('hex');
  const versionId = await addKnowledgeDocumentVersionDefiner({
    documentId,
    version: versionNum,
    createdByUserId: user.id,
    s3Key,
    checksum,
    byteSize: opts.buffer.byteLength,
    mimeType: mime,
  });

  if (opts.courseId) {
    await linkDocumentToCourse(user, opts.courseId, documentId);
  }

  scheduleKnowledgeDocumentProcess(documentId, opts.workspaceId);
  const created = await fetchKnowledgeDocumentById(documentId);
  if (!created || created.deletedAt) {
    throw ApiError.badRequest('Document was created but could not be loaded');
  }
  return {
    id: created.id,
    workspaceId: created.workspaceId,
    title: created.title,
    sourceKind: 'UPLOAD',
    mimeType: mime,
    byteSize: opts.buffer.byteLength,
    status: 'PENDING',
    errorMessage: null,
    externalUrl: null,
    connectorId: null,
    currentVersionId: versionId,
    visibility: created.visibility,
    createdByUserId: created.createdByUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export type KnowledgeZipImportResult = {
  documents: KnowledgeDocumentSummary[];
  imported: number;
  skipped: ZipImportSkip[];
};

/**
 * Unpack a zip into workspace Knowledge docs (one per supported file).
 * Titles use folder path segments so packs stay organized for authoring.
 */
export async function importWorkspaceDocumentsFromZip(
  user: AuthUser,
  opts: {
    workspaceId: string;
    fileName: string;
    buffer: Buffer;
    courseId?: string | null;
  },
): Promise<KnowledgeZipImportResult> {
  await assertWorkspaceFaculty(user, opts.workspaceId);
  if (!isS3Configured()) {
    throw ApiError.badRequest('File storage is not configured (S3)');
  }
  if (opts.buffer.byteLength > MAX_ZIP_UPLOAD_BYTES) {
    throw ApiError.badRequest('Zip exceeds 50 MB limit');
  }

  const { entries, skipped } = await extractKnowledgeZipEntries(opts.buffer);
  const documents: KnowledgeDocumentSummary[] = [];

  for (const entry of entries) {
    try {
      const doc = await addWorkspaceDocumentFromUpload(user, {
        workspaceId: opts.workspaceId,
        title: entry.title,
        fileName: entry.fileName,
        mimeType: entry.mimeType,
        buffer: entry.buffer,
        courseId: opts.courseId,
      });
      documents.push(doc);
    } catch (err) {
      skipped.push({
        path: entry.relativePath,
        reason: err instanceof Error ? err.message : 'Import failed',
      });
    }
  }

  if (documents.length === 0) {
    const s3Fails = skipped.filter((s) =>
      /s3|storage is not configured|credentials/i.test(s.reason),
    );
    if (s3Fails.length > 0) {
      throw ApiError.badRequest(
        'Could not store files in S3. Check AWS credentials (aws login) and try again.',
        { skipped },
      );
    }
    const reasons = [...new Set(skipped.map((s) => s.reason))].slice(0, 3);
    throw ApiError.badRequest(
      reasons.length > 0
        ? `Nothing imported: ${reasons.join('; ')}`
        : 'Zip had no files that could be imported into Knowledge',
      { skipped },
    );
  }

  return {
    documents,
    imported: documents.length,
    skipped,
  };
}

/** New version from upload (replaces current pointer after process). */
export async function addDocumentVersionFromUpload(
  user: AuthUser,
  documentId: string,
  opts: { fileName: string; mimeType: string; buffer: Buffer },
): Promise<KnowledgeDocumentSummary> {
  const doc = await db.query.knowledgeDocuments.findFirst({
    where: and(
      eq(knowledgeDocuments.id, documentId),
      isNull(knowledgeDocuments.deletedAt),
    ),
  });
  if (!doc) throw ApiError.notFound('Document not found');
  await assertWorkspaceFaculty(user, doc.workspaceId);
  if (!isS3Configured()) {
    throw ApiError.badRequest('File storage is not configured (S3)');
  }

  const versionNum = await nextDocumentVersionNumber(documentId);
  const s3Key = buildKnowledgeS3Key(
    doc.workspaceId,
    documentId,
    versionNum,
    opts.fileName,
  );
  await putMaterialObject({
    key: s3Key,
    body: opts.buffer,
    contentType: opts.mimeType,
  });
  const checksum = createHash('sha256').update(opts.buffer).digest('hex');
  const { addKnowledgeDocumentVersionDefiner } = await import(
    '@/lib/db/entityScopedReads'
  );
  const versionId = await addKnowledgeDocumentVersionDefiner({
    documentId,
    version: versionNum,
    createdByUserId: user.id,
    s3Key,
    checksum,
    byteSize: opts.buffer.byteLength,
    mimeType: opts.mimeType,
  });

  await notifyLinkedCoursesOfNewVersion(documentId, versionId);
  scheduleKnowledgeDocumentProcess(documentId, doc.workspaceId);
  return toSummary({
    ...doc,
    currentVersionId: versionId,
    status: 'PENDING',
    mimeType: opts.mimeType,
    byteSize: opts.buffer.byteLength,
  });
}

/** Move a personal document into the shared workspace library. */
export async function shareDocumentToLibrary(
  user: AuthUser,
  documentId: string,
): Promise<KnowledgeDocumentSummary> {
  const doc = await db.query.knowledgeDocuments.findFirst({
    where: and(
      eq(knowledgeDocuments.id, documentId),
      isNull(knowledgeDocuments.deletedAt),
    ),
  });
  if (!doc) throw ApiError.notFound('Document not found');
  await assertWorkspaceFaculty(user, doc.workspaceId);
  const canShare =
    (await isWorkspaceKnowledgeCoordinator(user, doc.workspaceId)) ||
    doc.createdByUserId === user.id;
  if (!canShare) {
    throw ApiError.forbidden('You cannot share this document');
  }
  if (doc.visibility === 'workspace') {
    return toSummary(doc);
  }
  const { setKnowledgeDocumentVisibilityDefiner } = await import(
    '@/lib/db/entityScopedReads'
  );
  await setKnowledgeDocumentVisibilityDefiner(documentId, 'workspace');
  return toSummary({ ...doc, visibility: 'workspace', updatedAt: new Date() });
}

export async function softDeleteKnowledgeDocument(
  user: AuthUser,
  documentId: string,
): Promise<void> {
  const doc = await db.query.knowledgeDocuments.findFirst({
    where: eq(knowledgeDocuments.id, documentId),
  });
  if (!doc || doc.deletedAt) throw ApiError.notFound('Document not found');
  if (doc.visibility === 'workspace') {
    await assertWorkspaceLibraryAdmin(user, doc.workspaceId);
  } else {
    await assertWorkspaceFaculty(user, doc.workspaceId);
    if (
      !(await isWorkspaceKnowledgeCoordinator(user, doc.workspaceId)) &&
      doc.createdByUserId !== user.id
    ) {
      throw ApiError.forbidden('You cannot delete this document');
    }
  }
  const { softDeleteKnowledgeDocumentDefiner } = await import(
    '@/lib/db/entityScopedReads'
  );
  await softDeleteKnowledgeDocumentDefiner(documentId);
}

async function assertCanRenameKnowledgeDocument(
  user: AuthUser,
  doc: typeof knowledgeDocuments.$inferSelect,
): Promise<void> {
  await assertWorkspaceFaculty(user, doc.workspaceId);
  // Personal docs: owner or coordinator. Shared library: any faculty (display title only).
  if (doc.visibility === 'workspace') return;
  if (
    !(await isWorkspaceKnowledgeCoordinator(user, doc.workspaceId)) &&
    doc.createdByUserId !== user.id
  ) {
    throw ApiError.forbidden('You cannot rename this document');
  }
}

/** Display-only title rename (folder path lives in the title as `Folder / name`). */
export async function renameKnowledgeDocument(
  user: AuthUser,
  documentId: string,
  title: string,
): Promise<KnowledgeDocumentSummary> {
  const nextTitle = title.trim().slice(0, 300);
  if (!nextTitle) throw ApiError.badRequest('Title is required');

  const doc = await db.query.knowledgeDocuments.findFirst({
    where: and(
      eq(knowledgeDocuments.id, documentId),
      isNull(knowledgeDocuments.deletedAt),
    ),
  });
  if (!doc) throw ApiError.notFound('Document not found');
  await assertCanRenameKnowledgeDocument(user, doc);

  const { setKnowledgeDocumentTitleDefiner } = await import(
    '@/lib/db/entityScopedReads'
  );
  await setKnowledgeDocumentTitleDefiner(documentId, nextTitle);
  return toSummary({ ...doc, title: nextTitle, updatedAt: new Date() });
}

/**
 * Rename a virtual folder by rewriting the title prefix on every matching doc.
 * `fromFolder` / `toFolder` use the same ` / `-joined display paths as the UI.
 */
export async function renameKnowledgeFolder(
  user: AuthUser,
  workspaceId: string,
  fromFolder: string,
  toFolder: string,
): Promise<{ updated: number }> {
  const from = fromFolder.trim();
  const to = toFolder.trim().slice(0, 200);
  if (!from) throw ApiError.badRequest('Current folder name is required');
  if (!to) throw ApiError.badRequest('New folder name is required');
  if (from === to) return { updated: 0 };

  await assertWorkspaceFaculty(user, workspaceId);
  const docs = await listWorkspaceDocuments(user, workspaceId);

  const UNFILED = 'Unfiled';
  function splitPath(title: string): { folder: string; name: string } {
    const parts = title
      .split(/\s*\/\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      return { folder: UNFILED, name: title.trim() || 'Untitled' };
    }
    return {
      folder: parts.slice(0, -1).join(' / '),
      name: parts[parts.length - 1]!,
    };
  }
  function joinPath(folder: string, name: string): string {
    if (!folder || folder === UNFILED) return name;
    return `${folder} / ${name}`;
  }

  const targets = docs.filter((d) => splitPath(d.title).folder === from);
  if (targets.length === 0) return { updated: 0 };

  const { setKnowledgeDocumentTitleDefiner } = await import(
    '@/lib/db/entityScopedReads'
  );
  let updated = 0;
  for (const doc of targets) {
    const row = await db.query.knowledgeDocuments.findFirst({
      where: and(
        eq(knowledgeDocuments.id, doc.id),
        isNull(knowledgeDocuments.deletedAt),
      ),
    });
    if (!row) continue;
    try {
      await assertCanRenameKnowledgeDocument(user, row);
    } catch {
      continue;
    }
    const { name } = splitPath(doc.title);
    const nextTitle = joinPath(to, name).slice(0, 300);
    if (nextTitle === doc.title) continue;
    await setKnowledgeDocumentTitleDefiner(doc.id, nextTitle);
    updated += 1;
  }
  return { updated };
}

export async function reprocessDocumentForUser(
  user: AuthUser,
  documentId: string,
): Promise<void> {
  const doc = await db.query.knowledgeDocuments.findFirst({
    where: and(
      eq(knowledgeDocuments.id, documentId),
      isNull(knowledgeDocuments.deletedAt),
    ),
  });
  if (!doc) throw ApiError.notFound('Document not found');
  await assertWorkspaceFaculty(user, doc.workspaceId);
  await reprocessKnowledgeDocument(documentId);
}

export async function restoreDocumentVersionForUser(
  user: AuthUser,
  documentId: string,
  versionId: string,
): Promise<void> {
  const doc = await db.query.knowledgeDocuments.findFirst({
    where: and(
      eq(knowledgeDocuments.id, documentId),
      isNull(knowledgeDocuments.deletedAt),
    ),
  });
  if (!doc) throw ApiError.notFound('Document not found');
  await assertWorkspaceLibraryAdmin(user, doc.workspaceId);
  await restoreKnowledgeDocumentVersion(documentId, versionId);
  await notifyLinkedCoursesOfNewVersion(documentId, versionId);
}

/** Clone pinned knowledge links onto a new course (rollover). */
export async function cloneCourseKnowledgeLinks(
  fromCourseId: string,
  toCourseId: string,
  linkedByUserId?: string | null,
): Promise<number> {
  const { cloneCourseKnowledgeLinksDefiner } = await import(
    '@/lib/db/knowledgeJobDefiners'
  );
  return cloneCourseKnowledgeLinksDefiner({
    fromCourseId,
    toCourseId,
    linkedByUserId: linkedByUserId ?? null,
  });
}

export async function listVersionsForUser(
  user: AuthUser,
  documentId: string,
) {
  // FORCE RLS: bare knowledge_documents / versions reads return 0 without tenant GUC.
  const { fetchKnowledgeDocumentById, fetchKnowledgeDocumentVersions } =
    await import('@/lib/db/entityScopedReads');
  const doc = await fetchKnowledgeDocumentById(documentId);
  if (!doc || doc.deletedAt) throw ApiError.notFound('Document not found');
  await assertWorkspaceFaculty(user, doc.workspaceId);
  return fetchKnowledgeDocumentVersions(documentId);
}

export { processKnowledgeDocument };
