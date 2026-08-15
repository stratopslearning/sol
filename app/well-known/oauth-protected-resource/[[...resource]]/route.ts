/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for the SOL MCP server.
 *
 * Claude.ai / ChatGPT discover this document from the `WWW-Authenticate`
 * challenge on `/api/mcp`, or by inserting the well-known segment into the
 * resource path (`/.well-known/oauth-protected-resource/learning/api/mcp`).
 * The App Router can't own a literal `.well-known` segment on this Next
 * version, so middleware.ts rewrites both the apex and basePath forms of
 * `/.well-known/*` onto this internal `/well-known/*` route; the optional
 * catch-all accepts any resource-path suffix.
 *
 * Advertises Clerk (the app IdP) as the authorization server, with the
 * resource pinned to the absolute MCP URL including the `/learning` basePath.
 */
import { generateClerkProtectedResourceMetadata } from '@clerk/mcp-tools/server';

import { mcpResourceUrl, resolvePublicOrigin } from '@/lib/api/mcpAuth';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'false',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
} as const;

export async function GET(req: Request) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return Response.json(
      { error: 'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' },
      { status: 500 },
    );
  }

  const metadata = generateClerkProtectedResourceMetadata({
    publishableKey,
    resourceUrl: mcpResourceUrl(resolvePublicOrigin(req)),
    properties: {
      resource_name: 'SOL Professor MCP',
      scopes_supported: ['openid', 'profile', 'email'],
    },
  });

  return Response.json(metadata, {
    headers: {
      'Cache-Control': 'max-age=3600',
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
