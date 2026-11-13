/**
 * LTI 1.3 Dynamic Registration (IMS) — pure helpers + the network exchange.
 *
 * Flow: platform sends the admin to our registration entry with
 * `openid_configuration` (+ optional `registration_token`). We
 *   1. fetch + validate the platform OpenID configuration,
 *   2. POST our tool registration to its `registration_endpoint`,
 *   3. receive the issued `client_id`,
 * and the caller upserts `lti_platforms`.
 */
import { z } from 'zod';

export const openIdConfigSchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  jwks_uri: z.string().url(),
  registration_endpoint: z.string().url(),
});
export type OpenIdConfig = z.infer<typeof openIdConfigSchema>;

const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i;

/** SSRF guard: https only, no loopback/private/link-local hosts. */
export function assertPublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'https:') throw new Error('URL must use https');
  if (PRIVATE_HOST.test(url.hostname)) {
    throw new Error('URL host is not allowed');
  }
  return url;
}

export type ToolUrls = {
  baseUrl: string;
  loginUrl: string;
  launchUrl: string;
  jwksUrl: string;
};

export function buildToolRegistration(urls: ToolUrls, clientName: string) {
  const domain = new URL(urls.baseUrl).host;
  return {
    application_type: 'web',
    response_types: ['id_token'],
    grant_types: ['implicit', 'client_credentials'],
    initiate_login_uri: urls.loginUrl,
    redirect_uris: [urls.launchUrl],
    client_name: clientName,
    jwks_uri: urls.jwksUrl,
    token_endpoint_auth_method: 'private_key_jwt',
    scope: [
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
      'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
      'https://purl.imsglobal.org/spec/lti-ags/scope/score',
      'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
    ].join(' '),
    'https://purl.imsglobal.org/spec/lti-tool-configuration': {
      domain,
      target_link_uri: urls.launchUrl,
      claims: ['iss', 'sub', 'name', 'email', 'given_name', 'family_name'],
      messages: [{ type: 'LtiResourceLinkRequest', target_link_uri: urls.launchUrl }],
    },
  };
}

export const registrationResponseSchema = z.object({
  client_id: z.union([z.string(), z.number()]).transform(String),
});

export class DynamicRegistrationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'DynamicRegistrationError';
  }
}

export async function fetchOpenIdConfig(
  openidConfigurationUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenIdConfig> {
  const url = assertPublicHttpsUrl(openidConfigurationUrl);
  const res = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new DynamicRegistrationError(
      `Platform configuration fetch failed (${res.status})`,
      502,
    );
  }
  const parsed = openIdConfigSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new DynamicRegistrationError('Platform OpenID configuration is incomplete');
  }
  const cfg = parsed.data;
  // Spec: the configuration issuer must match the host serving it.
  if (new URL(cfg.issuer).host !== url.host) {
    throw new DynamicRegistrationError('Platform issuer does not match configuration host');
  }
  for (const u of [
    cfg.authorization_endpoint,
    cfg.token_endpoint,
    cfg.jwks_uri,
    cfg.registration_endpoint,
  ]) {
    assertPublicHttpsUrl(u);
  }
  return cfg;
}

export async function registerToolWithPlatform(opts: {
  config: OpenIdConfig;
  registrationToken?: string;
  urls: ToolUrls;
  clientName: string;
  fetchImpl?: typeof fetch;
}): Promise<{ clientId: string }> {
  const f = opts.fetchImpl ?? fetch;
  const res = await f(opts.config.registration_endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(opts.registrationToken
        ? { authorization: `Bearer ${opts.registrationToken}` }
        : {}),
    },
    body: JSON.stringify(buildToolRegistration(opts.urls, opts.clientName)),
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new DynamicRegistrationError(
      `Platform rejected registration (${res.status})`,
      502,
    );
  }
  const parsed = registrationResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new DynamicRegistrationError('Platform returned no client_id', 502);
  }
  return { clientId: parsed.data.client_id };
}
