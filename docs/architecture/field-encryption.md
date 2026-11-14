# Field encryption & cache-key hashing

Status: Wave 4 items 25 / 27. Local + `sol-knowledge-dev` only.

## What is encrypted

| Data | Mechanism | Module |
| --- | --- | --- |
| `attempts.answers` (student free text) | AES-256-GCM, `fe1.<iv>.<tag>.<data>` blobs, opt-in via `FIELD_ENCRYPTION_ENABLED=true` | `lib/crypto/fieldEncryption.ts` |
| Connector/LTI tokens | Same primitive, key from `CONNECTOR_TOKEN_SECRET` fallback | `lib/crypto/fieldEncryption.ts` |

Key: `FIELD_ENCRYPTION_KEY` (or `CONNECTOR_TOKEN_SECRET`), SHA-256 derived to 32 bytes.
There is no key id in the blob yet — rotation = dual-key read, tracked below.

## Where plaintext may exist (decrypt boundaries)

1. **Student data export** — `lib/student/exportData.ts` (the owner reading their own data).
2. **AI gateway path** — `lib/ai/gateway.ts`. Grading / tutoring need plaintext to build the
   prompt. Decrypt immediately before `runAi`, pass through `minimizeEducationPayload`, never
   log or persist the plaintext. TODO(27): move decrypt + minimization *into* `runAi` so callers
   cannot forget.
3. Everything else (lists, analytics, gradebook aggregates, logs, traces) must treat answers as
   opaque or use derived, non-reversible values (scores, hashes).

## Grading cache (item 25 verification)

`lib/gradingCache.ts#computeCacheKey` includes: **tenant id**, question id, rubric version,
model version, scoring version, **materials-context hash**, normalized answer. Cross-tenant
hits are therefore impossible and a materials change invalidates. Verified by
`tests/unit/gradingCache.test.ts` (key differs by tenant / materials).

### Item 27: HMAC cache keys

Plain SHA-256 over short normalized answers is dictionary-attackable by anyone who can read the
`grading_cache` table. `lib/crypto/cacheKeyHmac.ts#hashCacheKey` switches the key to
`HMAC-SHA256(CACHE_KEY_HMAC_SECRET, payload)` when the secret is set.

- Opt-in (unset = legacy SHA-256, byte-identical keys).
- Enabling causes a one-time cold cache; rows are version-keyed and age out.
- Keep the secret separate from `FIELD_ENCRYPTION_KEY`.

## Follow-ups

- Key id in blob + dual-key decrypt for rotation.
- Encrypt cached grading `feedback` when it quotes the student answer.
- Make `FIELD_ENCRYPTION_ENABLED` default-on once all readers go through `maybeDecryptAttemptAnswers`.
