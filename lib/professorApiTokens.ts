/**
 * Professor personal access tokens (PATs) for the professor REST API and the
 * MCP server.
 *
 * Format: `sol_pat_<40 hex chars>`. Only the SHA-256 hash is persisted; the
 * plaintext is returned exactly once at mint time. Tokens carry scopes that
 * gate which tool families they may call — session (cookie) auth implicitly
 * has every scope, so scopes only constrain agent access.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { professorApiTokens, users } from '@/app/db/schema';
import { toUserData, type UserData } from '@/lib/getOrCreateUser';

export const TOKEN_PREFIX = 'sol_pat_';

export const TOKEN_SCOPES = [
  'read',
  'sections:write',
  'quizzes:write',
  'grades:write',
  'discussions:write',
] as const;

export type TokenScope = (typeof TOKEN_SCOPES)[number];

/** Conservative default for newly minted tokens: read + quiz authoring. */
export const DEFAULT_TOKEN_SCOPES: TokenScope[] = ['read', 'quizzes:write'];

export function isTokenScope(value: string): value is TokenScope {
  return (TOKEN_SCOPES as readonly string[]).includes(value);
}

export function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function generateTokenSecret(): string {
  return `${TOKEN_PREFIX}${randomBytes(20).toString('hex')}`;
}

export function looksLikeApiToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(TOKEN_PREFIX);
}

export interface MintedToken {
  id: string;
  name: string;
  /** Plaintext secret — shown once, never stored. */
  token: string;
  prefix: string;
  scopes: TokenScope[];
  expiresAt: Date | null;
  createdAt: Date;
}

export async function mintProfessorApiToken(opts: {
  userId: string;
  name: string;
  scopes: TokenScope[];
  expiresAt?: Date | null;
}): Promise<MintedToken> {
  const secret = generateTokenSecret();
  const [row] = await db
    .insert(professorApiTokens)
    .values({
      userId: opts.userId,
      name: opts.name,
      tokenHash: hashToken(secret),
      prefix: secret.slice(0, TOKEN_PREFIX.length + 4),
      scopes: opts.scopes,
      expiresAt: opts.expiresAt ?? null,
    })
    .returning();

  return {
    id: row.id,
    name: row.name,
    token: secret,
    prefix: row.prefix,
    scopes: opts.scopes,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export interface TokenListItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export async function listProfessorApiTokens(
  userId: string,
): Promise<TokenListItem[]> {
  const rows = await db.query.professorApiTokens.findMany({
    where: eq(professorApiTokens.userId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  }));
}

/** Tombstone the token. Returns false when it doesn't exist / isn't yours. */
export async function revokeProfessorApiToken(opts: {
  userId: string;
  tokenId: string;
}): Promise<boolean> {
  const [updated] = await db
    .update(professorApiTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(professorApiTokens.id, opts.tokenId),
        eq(professorApiTokens.userId, opts.userId),
        isNull(professorApiTokens.revokedAt),
      ),
    )
    .returning();
  return Boolean(updated);
}

export interface VerifiedToken {
  tokenId: string;
  scopes: TokenScope[];
  user: UserData;
}

/**
 * Resolve a plaintext bearer token to its owning user. Returns null for
 * unknown, revoked, or expired tokens, and for owners that are no longer
 * PROFESSOR/ADMIN (role downgrades revoke agent access immediately).
 */
export async function verifyProfessorApiToken(
  plaintext: string,
): Promise<VerifiedToken | null> {
  if (!looksLikeApiToken(plaintext)) return null;

  const hashed = hashToken(plaintext);
  const row = await db.query.professorApiTokens.findFirst({
    where: eq(professorApiTokens.tokenHash, hashed),
  });
  if (!row || row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  // Defense in depth: constant-time compare of the recomputed hash against the
  // stored one (the indexed lookup above is already exact-match).
  const a = Buffer.from(hashed);
  const b = Buffer.from(row.tokenHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const owner = await db.query.users.findFirst({
    where: eq(users.id, row.userId),
  });
  if (!owner || (owner.role !== 'PROFESSOR' && owner.role !== 'ADMIN')) {
    return null;
  }

  // Fire-and-forget usage stamp; failures must not block the request.
  db.update(professorApiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(professorApiTokens.id, row.id))
    .catch((err) => console.error('PAT lastUsedAt update failed:', err));

  const scopes = (Array.isArray(row.scopes) ? row.scopes : []).filter(
    isTokenScope,
  );

  return { tokenId: row.id, scopes, user: toUserData(owner) };
}
