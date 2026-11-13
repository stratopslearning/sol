/**
 * Private S3 storage for course material originals.
 * Legacy keys: courses/{courseId}/{materialId}/{safeFileName}
 * New uploads (when tenantId known): tenants/{tenantId}/...
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@/lib/env';

let cachedClient: S3Client | null = null;

export function isS3Configured(): boolean {
  const e = env();
  return Boolean(e.AWS_S3_BUCKET && e.AWS_REGION);
}

function requireBucket(): { bucket: string; region: string } {
  const e = env();
  if (!e.AWS_S3_BUCKET || !e.AWS_REGION) {
    throw new Error(
      'AWS_S3_BUCKET and AWS_REGION must be set for Knowledge file storage.',
    );
  }
  return { bucket: e.AWS_S3_BUCKET, region: e.AWS_REGION };
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const { region } = requireBucket();
  // Default credential chain: env keys, shared credentials / AWS_PROFILE, etc.
  cachedClient = new S3Client({ region });
  return cachedClient;
}

function safeFileSegment(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
}

/** Prefix object keys with a tenant id for multi-tenant isolation in S3. */
export function tenantObjectKey(tenantId: string, ...parts: string[]): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9-]+/g, '').slice(0, 64);
  const safeParts = parts
    .filter(Boolean)
    .map((p) => p.replace(/[^a-zA-Z0-9/._-]+/g, '_'));
  return `tenants/${safeTenant}/${safeParts.join('/')}`;
}

export function buildMaterialS3Key(
  courseId: string,
  materialId: string,
  fileName: string,
  tenantId?: string | null,
): string {
  const safe = safeFileSegment(fileName);
  const leaf = `courses/${courseId}/${materialId}/${safe || 'upload.bin'}`;
  if (tenantId) return tenantObjectKey(tenantId, leaf);
  return leaf;
}

/** Workspace knowledge library object key (tenant-prefixed when workspaceId set). */
export function buildKnowledgeS3Key(
  workspaceId: string,
  documentId: string,
  version: number,
  fileName: string,
): string {
  const safe = safeFileSegment(fileName);
  return tenantObjectKey(
    workspaceId,
    'knowledge',
    documentId,
    `v${version}`,
    safe || 'upload.bin',
  );
}

export async function putMaterialObject(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<void> {
  const { bucket } = requireBucket();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
      ServerSideEncryption: 'AES256',
    }),
  );
}

export async function getMaterialObjectBytes(key: string): Promise<Buffer> {
  const { bucket } = requireBucket();
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!res.Body) throw new Error('Empty S3 object body');
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/** Presigned GET URL for private objects (default 15 minutes). */
export async function getMaterialObjectPresignedUrl(
  key: string,
  expiresInSeconds = 900,
): Promise<string | null> {
  if (!isS3Configured()) return null;
  const { bucket } = requireBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), command, {
    expiresIn: Math.max(60, Math.min(expiresInSeconds, 86_400)),
  });
}

/**
 * Presigned PUT for browser → S3 uploads (bypasses Vercel ~4.5 MB body limit).
 * Caller must send the same Content-Type header used when signing.
 * Omits SSE headers so browsers only need Content-Type (bucket default encryption applies).
 */
export async function getMaterialObjectPresignedPutUrl(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { bucket } = requireBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: Math.max(
      60,
      Math.min(opts.expiresInSeconds ?? 900, 86_400),
    ),
  });
}

/** Object metadata when present; null if missing. */
export async function headMaterialObject(
  key: string,
): Promise<{ contentLength: number; contentType?: string } | null> {
  if (!isS3Configured()) return null;
  const { bucket } = requireBucket();
  try {
    const res = await getClient().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return {
      contentLength: Number(res.ContentLength ?? 0),
      contentType: res.ContentType,
    };
  } catch {
    return null;
  }
}

export async function deleteMaterialObject(key: string): Promise<void> {
  const { bucket } = requireBucket();
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
}
