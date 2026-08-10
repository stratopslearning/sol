/**
 * Unified auth for professor-facing API routes and MCP tools.
 *
 * Two ways in:
 *   1. Clerk browser session (the dashboard) — full access, all scopes.
 *   2. `Authorization: Bearer sol_pat_…` personal access token — scoped agent
 *      access (see `lib/professorApiTokens.ts`).
 *
 * Both resolve to the same DB user row so every downstream ownership check
 * (`professor_sections`, `quizzes.professorId`, …) behaves identically.
 */
import type { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { getOrCreateUser, type UserData } from '@/lib/getOrCreateUser';
import {
  looksLikeApiToken,
  TOKEN_SCOPES,
  verifyProfessorApiToken,
  type TokenScope,
} from '@/lib/professorApiTokens';

export interface ProfessorApiAuth {
  user: UserData;
  /** True when authenticated via personal access token (agent path). */
  viaToken: boolean;
  tokenId: string | null;
  scopes: TokenScope[];
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Resolve the caller. Returns null when unauthenticated (missing/invalid
 * token AND no Clerk session). Role checks stay in the route/tool so each can
 * keep its own PROFESSOR vs PROFESSOR|ADMIN policy.
 */
export async function authenticateProfessorRequest(
  req: NextRequest | Request,
): Promise<ProfessorApiAuth | null> {
  const bearer = extractBearerToken(req);

  if (bearer && looksLikeApiToken(bearer)) {
    const verified = await verifyProfessorApiToken(bearer);
    if (!verified) return null;
    return {
      user: verified.user,
      viaToken: true,
      tokenId: verified.tokenId,
      scopes: verified.scopes,
    };
  }

  const user = await getOrCreateUser();
  if (!user) return null;
  return {
    user,
    viaToken: false,
    tokenId: null,
    scopes: [...TOKEN_SCOPES],
  };
}

/** Session auth always passes; token auth needs the scope on the token. */
export function hasScope(
  auth: Pick<ProfessorApiAuth, 'viaToken' | 'scopes'>,
  scope: TokenScope,
): boolean {
  if (!auth.viaToken) return true;
  return auth.scopes.includes(scope);
}

export function isProfessorOrAdmin(user: Pick<UserData, 'role'>): boolean {
  return user.role === 'PROFESSOR' || user.role === 'ADMIN';
}

/**
 * One-line guard for professor API routes. Throws `ApiError` (which
 * `apiErrorResponse` maps to 401/403) when the caller is unauthenticated,
 * has the wrong role, or the token lacks the required scope.
 */
export async function requireProfessorApi(
  req: NextRequest | Request,
  opts: {
    scope?: TokenScope;
    /** Routes like enroll/export that reject ADMIN, mirroring existing behavior. */
    professorOnly?: boolean;
  } = {},
): Promise<ProfessorApiAuth> {
  const auth = await authenticateProfessorRequest(req);
  if (!auth) throw ApiError.unauthorized();

  const roleOk = opts.professorOnly
    ? auth.user.role === 'PROFESSOR'
    : isProfessorOrAdmin(auth.user);
  if (!roleOk) throw ApiError.forbidden();

  if (opts.scope && !hasScope(auth, opts.scope)) {
    throw ApiError.forbidden(
      `This token is missing the '${opts.scope}' scope`,
    );
  }
  return auth;
}
