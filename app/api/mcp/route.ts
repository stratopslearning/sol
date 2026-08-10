/**
 * SOL professor MCP server — Streamable HTTP endpoint (stateless, JSON
 * responses).
 *
 * Agents connect with:
 *   URL:    https://<host>/learning/api/mcp
 *   Header: Authorization: Bearer sol_pat_…   (minted on the Agent Access page)
 *
 * Auth is personal-access-token only (no Clerk cookies): the edge middleware
 * lets this path through and we verify the token here. Every tool call runs
 * through `lib/professor/*` services, which enforce the same ownership rules
 * and audit logging as the dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';

import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { logAudit } from '@/lib/audit';
import {
  handleMcpBody,
  PARSE_ERROR,
} from '@/lib/mcp/protocol';
import type { ProfessorApiAuth } from '@/lib/api/professorAuth';
import { extractBearerToken } from '@/lib/api/professorAuth';
import { TOKEN_SCOPES, verifyProfessorApiToken } from '@/lib/professorApiTokens';

export const dynamic = 'force-dynamic';
// Synchronous batch regrades can call OpenAI several times.
export const maxDuration = 120;

function unauthorized(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="SOL MCP"' },
    },
  );
}

async function authenticate(req: NextRequest): Promise<ProfessorApiAuth | null> {
  const bearer = extractBearerToken(req);
  if (!bearer) return null;
  const verified = await verifyProfessorApiToken(bearer);
  if (!verified) return null;
  return {
    user: verified.user,
    viaToken: true,
    tokenId: verified.tokenId,
    scopes: verified.scopes.length > 0 ? verified.scopes : [...TOKEN_SCOPES],
  };
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return unauthorized(
      'Missing or invalid access token. Mint one on the SOL Agent Access page and send it as "Authorization: Bearer <token>".',
    );
  }

  // Agents can loop; keep MCP stricter than the interactive UI.
  const limited = await enforceRateLimit({
    key: `mcp:${auth.user.id}`,
    limit: 120,
    windowMs: 60_000,
    prefix: 'rl',
    message: 'MCP rate limit exceeded. Slow down and retry shortly.',
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: PARSE_ERROR, message: 'Parse error: invalid JSON' },
      },
      { status: 400 },
    );
  }

  // Audit tool calls (not list/ping chatter) so agent activity is attributable
  // to the professor and token that performed it.
  const calls = (Array.isArray(body) ? body : [body]).filter(
    (m): m is { method?: string; params?: { name?: string } } =>
      !!m && typeof m === 'object',
  );
  for (const call of calls) {
    if (call.method === 'tools/call') {
      await logAudit({
        actorUserId: auth.user.id,
        actorClerkId: auth.user.clerkId,
        action: 'mcp.tool.call',
        targetType: 'mcp_tool',
        targetId: call.params?.name ?? 'unknown',
        metadata: { tokenId: auth.tokenId },
      });
    }
  }

  const result = await handleMcpBody(body, auth);
  if (result === null) {
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(result);
}

/** No server-initiated streams: tell clients not to open an SSE channel. */
export async function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: 'POST' },
  });
}

export async function DELETE() {
  // Stateless server — there is no session to terminate.
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: 'POST' },
  });
}
