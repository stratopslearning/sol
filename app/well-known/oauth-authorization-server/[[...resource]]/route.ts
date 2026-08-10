/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414) compatibility endpoint.
 *
 * Newer MCP clients follow `authorization_servers` from the protected
 * resource metadata straight to Clerk; older ones probe the resource host
 * itself (with or without the resource path suffix — hence the catch-all).
 * We proxy Clerk's metadata so both generations resolve the same authorize /
 * token / registration endpoints, including Dynamic Client Registration.
 */
import { fetchClerkAuthorizationServerMetadata } from '@clerk/mcp-tools/server';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
} as const;

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return Response.json(
      { error: 'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' },
      { status: 500 },
    );
  }

  const metadata = await fetchClerkAuthorizationServerMetadata({
    publishableKey,
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
