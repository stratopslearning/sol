import { importPKCS8, SignJWT } from 'jose';

import { type LtiToolConfig, LTI_SCOPES } from '@/lib/lti/config';

type CachedToken = { accessToken: string; expiresAt: number };

const tokenCache = new Map<string, CachedToken>();

async function clientAssertion(
  config: LtiToolConfig,
  scopes: string[],
): Promise<string> {
  const key = await importPKCS8(config.toolPrivateKeyPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    scope: scopes.join(' '),
  })
    .setProtectedHeader({ alg: 'RS256', kid: config.toolKeyId, typ: 'JWT' })
    .setIssuer(config.clientId)
    .setSubject(config.clientId)
    .setAudience(config.authTokenUrl)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .setJti(crypto.randomUUID())
    .sign(key);
}

/** OAuth2 client_credentials access token for AGS / NRPS. */
export async function getPlatformAccessToken(
  config: LtiToolConfig,
  scopes: string[],
): Promise<string> {
  const cacheKey = `${config.clientId}:${scopes.slice().sort().join(' ')}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken;
  }

  const assertion = await clientAssertion(config, scopes);
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type:
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertion,
    scope: scopes.join(' '),
  });

  const res = await fetch(config.authTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `LTI token request failed (${res.status}): ${text.slice(0, 400)}`,
    );
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error('LTI token response missing access_token');
  }

  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  tokenCache.set(cacheKey, {
    accessToken: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return json.access_token;
}

export const AGS_SCOPES = [
  LTI_SCOPES.lineitem,
  LTI_SCOPES.score,
  LTI_SCOPES.resultReadonly,
];

export const NRPS_SCOPES = [LTI_SCOPES.nrps];
