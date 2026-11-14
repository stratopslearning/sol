import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Encrypt connector OAuth tokens at rest.
 * Requires CONNECTOR_TOKEN_SECRET — never derive from DATABASE_URL (rotating
 * the DB URL would brick stored tokens and a shared DB hash is not a secret).
 */
function secretKey(): Buffer {
  const raw = process.env.CONNECTOR_TOKEN_SECRET?.trim();
  if (!raw) {
    throw new Error(
      'CONNECTOR_TOKEN_SECRET is required to encrypt/decrypt connector tokens.',
    );
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptSecretJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecretJson<T = unknown>(blob: string): T {
  const [ver, ivB64, tagB64, dataB64] = blob.split('.');
  if (ver !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted token blob');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    secretKey(),
    Buffer.from(ivB64, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return JSON.parse(dec.toString('utf8')) as T;
}

export type OAuthTokenBundle = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  extra?: Record<string, unknown>;
};
