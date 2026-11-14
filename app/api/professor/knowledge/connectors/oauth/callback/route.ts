import { NextRequest, NextResponse } from 'next/server';

import { withBasePath } from '@/lib/basePath';
import { completeConnectorOAuth } from '@/lib/knowledge';
import { absoluteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');

  if (oauthError || !code || !state) {
    const dest = withBasePath(
      `/dashboard/workspace/knowledge?tab=connections&error=${encodeURIComponent(oauthError || 'oauth_failed')}`,
    );
    return NextResponse.redirect(new URL(dest, req.url));
  }

  try {
    const redirectUri = absoluteUrl(
      '/api/professor/knowledge/connectors/oauth/callback',
    );
    const { workspaceId } = await completeConnectorOAuth({
      code,
      state,
      redirectUri,
    });
    const dest = withBasePath(
      `/dashboard/workspace/knowledge?tab=connections&workspaceId=${workspaceId}&connected=1`,
    );
    return NextResponse.redirect(new URL(dest, req.url));
  } catch (err) {
    console.error('[connector oauth callback]', err);
    const dest = withBasePath(
      `/dashboard/workspace/knowledge?tab=connections&error=token_exchange`,
    );
    return NextResponse.redirect(new URL(dest, req.url));
  }
}
