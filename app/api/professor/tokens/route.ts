import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import {
  DEFAULT_TOKEN_SCOPES,
  listProfessorApiTokens,
  mintProfessorApiToken,
  TOKEN_SCOPES,
} from '@/lib/professorApiTokens';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.enum(TOKEN_SCOPES)).min(1).optional(),
  /** ISO date; null/omitted = no expiry. */
  expiresAt: z.string().datetime().nullable().optional(),
});

/**
 * Token management is deliberately session-only: an agent holding a PAT must
 * never be able to mint or enumerate other tokens.
 */
async function requireSessionProfessor() {
  const user = await getOrCreateUser();
  if (!user) throw ApiError.unauthorized();
  if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
    throw ApiError.forbidden();
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireSessionProfessor();
    const tokens = await listProfessorApiTokens(user.id);
    return NextResponse.json({ tokens });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionProfessor();

    // Validate before rate-limiting so retries on bad input don't burn quota.
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation error', parsed.error.errors);
    }

    const existing = await listProfessorApiTokens(user.id);
    const activeCount = existing.filter((t) => !t.revokedAt).length;
    if (activeCount >= 10) {
      throw ApiError.badRequest(
        'Token limit reached (10 active). Revoke an unused token first.',
      );
    }

    // Generous window: minting is rare, but hydration remounts / double-clicks
    // were burning a 10/min budget before a token ever landed.
    const limited = await enforceRateLimit({
      key: `token-mint:${user.id}`,
      limit: 20,
      windowMs: 60 * 60_000,
      prefix: 'rl:pat',
      message: 'Too many token requests. Please wait a moment.',
    });
    if (limited) return limited;

    const minted = await mintProfessorApiToken({
      userId: user.id,
      name: parsed.data.name,
      scopes: parsed.data.scopes ?? DEFAULT_TOKEN_SCOPES,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'professor.api_token.create',
      targetType: 'api_token',
      targetId: minted.id,
      metadata: { name: minted.name, scopes: minted.scopes },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // `token` is the only time the plaintext secret leaves the server.
    return NextResponse.json({
      success: true,
      token: minted.token,
      tokenInfo: {
        id: minted.id,
        name: minted.name,
        prefix: minted.prefix,
        scopes: minted.scopes,
        expiresAt: minted.expiresAt,
        createdAt: minted.createdAt,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
