/**
 * Keyed cache-key hashing (Wave 4 item 27).
 *
 * Plain SHA-256 of a normalized short student answer is dictionary-attackable
 * by anyone who can read the grading_cache table ("is this the answer 'true'?").
 * When CACHE_KEY_HMAC_SECRET is set, cache keys become
 * HMAC-SHA256(secret, payload) so they are useless without the secret.
 *
 * Opt-in on purpose: enabling the secret changes every key, i.e. a one-time
 * cold cache (rows are version-keyed and simply age out). With the secret
 * unset behaviour is byte-for-byte the legacy SHA-256.
 */
import { createHash, createHmac } from 'node:crypto';

export function cacheKeyHmacSecret(): string | null {
  const s = process.env.CACHE_KEY_HMAC_SECRET?.trim();
  return s ? s : null;
}

export function hashCacheKey(payload: string): string {
  const secret = cacheKeyHmacSecret();
  return secret
    ? createHmac('sha256', secret).update(payload).digest('hex')
    : createHash('sha256').update(payload).digest('hex');
}
