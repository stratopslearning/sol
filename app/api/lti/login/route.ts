import { NextRequest, NextResponse } from 'next/server';

import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getLtiConfig } from '@/lib/lti/config';
import {
  ensurePlatformFromEnv,
  resolveLtiWorkspaceId,
} from '@/lib/lti/platform';
import { oidcStateCookieOptions, sealOidcState } from '@/lib/lti/state';

export const dynamic = 'force-dynamic';

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function handleLogin(req: NextRequest) {
  const limited = await enforceRateLimit({
    key: `lti-login:${clientIp(req)}`,
    limit: 60,
    windowMs: 60_000,
    message: 'Too many LTI login attempts. Try again shortly.',
  });
  if (limited) return limited;

  const cfg = getLtiConfig();
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: 'LTI is not enabled on this deployment' },
      { status: 503 },
    );
  }

  await ensurePlatformFromEnv(await resolveLtiWorkspaceId());

  const source =
    req.method === 'POST'
      ? await req.formData().catch(() => null)
      : null;
  const params = req.nextUrl.searchParams;

  const get = (key: string) => {
    const fromForm = source?.get(key);
    if (typeof fromForm === 'string' && fromForm) return fromForm;
    return params.get(key) ?? '';
  };

  const iss = get('iss');
  const loginHint = get('login_hint');
  const targetLinkUri = get('target_link_uri') || cfg.launchUrl;
  const ltiMessageHint = get('lti_message_hint');
  const clientId = get('client_id') || cfg.clientId;
  const ltiDeploymentId = get('lti_deployment_id');

  if (!iss) {
    return NextResponse.json({ error: 'Missing iss' }, { status: 400 });
  }
  if (iss !== cfg.issuer) {
    return NextResponse.json({ error: 'Unknown issuer' }, { status: 400 });
  }
  if (clientId !== cfg.clientId) {
    return NextResponse.json({ error: 'Unknown client_id' }, { status: 400 });
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const sealed = await sealOidcState({
    state,
    nonce,
    iss,
    clientId,
    loginHint: loginHint || undefined,
    targetLinkUri,
    ltiMessageHint: ltiMessageHint || undefined,
  });

  const authUrl = new URL(cfg.authLoginUrl);
  authUrl.searchParams.set('scope', 'openid');
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('response_mode', 'form_post');
  authUrl.searchParams.set('prompt', 'none');
  authUrl.searchParams.set('client_id', cfg.clientId);
  authUrl.searchParams.set('redirect_uri', cfg.launchUrl);
  authUrl.searchParams.set('login_hint', loginHint);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  if (ltiMessageHint) {
    authUrl.searchParams.set('lti_message_hint', ltiMessageHint);
  }
  if (ltiDeploymentId) {
    authUrl.searchParams.set('lti_deployment_id', ltiDeploymentId);
  }

  const res = NextResponse.redirect(authUrl.toString(), 302);
  const cookie = oidcStateCookieOptions();
  res.cookies.set(cookie.name, sealed, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return res;
}

export async function GET(req: NextRequest) {
  return handleLogin(req);
}

export async function POST(req: NextRequest) {
  return handleLogin(req);
}
