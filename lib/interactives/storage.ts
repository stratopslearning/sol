/**
 * Private S3 storage for .h5p packages.
 * Keys: tenants/{tenantId}/courses/{courseId}/interactives/{interactiveId}/{safeFileName}
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { env } from '@/lib/env';

let cachedClient: S3Client | null = null;

function requireBucket(): { bucket: string; region: string } {
  const e = env();
  if (!e.AWS_S3_BUCKET || !e.AWS_REGION) {
    throw new Error(
      'AWS_S3_BUCKET and AWS_REGION must be set for interactive package storage.',
    );
  }
  return { bucket: e.AWS_S3_BUCKET, region: e.AWS_REGION };
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const { region } = requireBucket();
  cachedClient = new S3Client({ region });
  return cachedClient;
}

export function buildInteractivePackageKey(
  courseId: string,
  interactiveId: string,
  fileName: string,
  tenantId?: string | null,
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
  const leaf = `courses/${courseId}/interactives/${interactiveId}/${safe || 'package.h5p'}`;
  if (tenantId) {
    const safeTenant = tenantId.replace(/[^a-zA-Z0-9-]+/g, '').slice(0, 64);
    return `tenants/${safeTenant}/${leaf}`;
  }
  return leaf;
}

export async function putInteractivePackage(opts: {
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

export async function getInteractivePackageBuffer(
  key: string,
): Promise<Buffer> {
  const { bucket } = requireBucket();
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error('Empty interactive package');
  return Buffer.from(bytes);
}

export async function deleteInteractivePackage(key: string): Promise<void> {
  const { bucket } = requireBucket();
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
}
