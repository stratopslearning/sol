/**
 * Field encryption (see docs/architecture/field-encryption.md).
 * Decrypt ONLY on: (a) the owning student's export (lib/student/exportData.ts),
 * and (b) the AI gateway path (lib/ai/gateway.ts) immediately before the
 * provider call. Never decrypt in list/analytics/log paths.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer {
  const raw =
    process.env.FIELD_ENCRYPTION_KEY?.trim() ||
    process.env.CONNECTOR_TOKEN_SECRET?.trim();
  if (!raw) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY or CONNECTOR_TOKEN_SECRET is required for field encryption',
    );
  }
  return createHash('sha256').update(raw).digest();
}

export function fieldEncryptionEnabled(): boolean {
  return process.env.FIELD_ENCRYPTION_ENABLED === 'true';
}

/** Encrypt a UTF-8 string for storage (v1 AES-256-GCM). */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const enc = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `fe1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptField(blob: string): string {
  const [ver, ivB64, tagB64, dataB64] = blob.split('.');
  if (ver !== 'fe1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted field blob');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivB64, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

/** Optional wrap for attempt answer maps on write when enabled. */
export function maybeEncryptAttemptAnswers(
  answers: Record<string, string>,
): Record<string, string> | { __encrypted: string } {
  if (!fieldEncryptionEnabled()) return answers;
  return { __encrypted: encryptField(JSON.stringify(answers)) };
}

export function maybeDecryptAttemptAnswers(
  stored: unknown,
): Record<string, string> {
  if (!stored || typeof stored !== 'object') return {};
  const obj = stored as Record<string, unknown>;
  if (typeof obj.__encrypted === 'string') {
    try {
      const parsed = JSON.parse(decryptField(obj.__encrypted)) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      return {};
    }
  }
  return obj as Record<string, string>;
}
