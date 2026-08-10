/**
 * SOL professor MCP server — Streamable HTTP endpoint (stateless, JSON
 * responses).
 *
 * Two ways to authenticate:
 *   - Personal access token (Cursor, Claude Code, any client with headers):
 *       Authorization: Bearer sol_pat_…   (minted on the Agent Access page)
 *   - Clerk OAuth 2.1 (Claude.ai, ChatGPT connectors): paste the MCP URL,
 *     the client discovers `/.well-known/oauth-protected-resource`, runs the
 *     Clerk browser flow, then sends the OAuth access token as the bearer.
 *
 * The edge middleware lets this path through (no login redirect) and we
 * verify the bearer here. Every tool call runs through `lib/professor/*`
 * services, which enforce the same ownership rules and audit logging as the
 * dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';

import {
  authenticateMcpRequest,
  mcpWwwAuthenticate,
  resolvePublicOrigin,
} from '@/lib/api/mcpAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { logAudit } from '@/lib/audit';
import {
  handleMcpBody,
  PARSE_ERROR,
} from '@/lib/mcp/protocol';

export const dynamic = 'force-dynamic';
// Synchronous batch regrades can call OpenAI several times.
export const maxDuration = 120;

/** Browser-based connectors preflight and read responses cross-origin. */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate',
  'Access-Control-Max-Age': '86400',
} as const;

function withCors(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

function authFailure(
  req: NextRequest,
  status: 401 | 403,
  message: string,
): NextResponse {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  if (status === 401) {
    // RFC 9728: point OAuth-capable clients at the protected-resource
    // metadata so they start the Clerk authorization flow.
    headers['WWW-Authenticate'] = mcpWwwAuthenticate(resolvePublicOrigin(req));
  }
  return NextResponse.json({ error: message }, { status, headers });
}

export async function POST(req: NextRequest) {
  const result = await authenticateMcpRequest(req);
  if (!result.ok) {
    return authFailure(req, result.status, result.message);
  }
  const auth = result.auth;

  // Agents can loop; keep MCP stricter than the interactive UI.
  const limited = await enforceRateLimit({
    key: `mcp:${auth.user.id}`,
    limit: 120,
    windowMs: 60_000,
    prefix: 'rl',
    message: 'MCP rate limit exceeded. Slow down and retry shortly.',
  });
  if (limited) return withCors(limited);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(
      NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: { code: PARSE_ERROR, message: 'Parse error: invalid JSON' },
        },
        { status: 400 },
      ),
    );
  }

  // Audit tool calls (not list/ping chatter) so agent activity is attributable
  // to the professor and the credential that performed it.
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
        metadata: {
          tokenId: auth.tokenId,
          via: auth.viaOAuth ? 'oauth' : 'pat',
        },
      });
    }
  }

  const result2 = await handleMcpBody(body, auth);
  if (result2 === null) {
    return withCors(new NextResponse(null, { status: 202 }));
  }
  return withCors(NextResponse.json(result2));
}

/** No server-initiated streams: tell clients not to open an SSE channel. */
export async function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: 'POST', ...CORS_HEADERS },
  });
}

export async function DELETE() {
  // Stateless server — there is no session to terminate.
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: 'POST', ...CORS_HEADERS },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
