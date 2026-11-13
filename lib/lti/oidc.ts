import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import { LTI_CLAIMS, type LtiToolConfig } from '@/lib/lti/config';

export type LtiIdTokenClaims = JWTPayload & {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  nonce?: string;
  [key: string]: unknown;
};

export type ParsedLtiLaunch = {
  claims: LtiIdTokenClaims;
  deploymentId: string;
  roles: string[];
  contextId: string | null;
  contextLabel: string | null;
  canvasCourseId: string | null;
  resourceLinkId: string | null;
  agsLineItemsUrl: string | null;
  nrpsMembershipsUrl: string | null;
  custom: Record<string, string>;
  messageType: string;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function platformJwks(keySetUrl: string) {
  let set = jwksCache.get(keySetUrl);
  if (!set) {
    set = createRemoteJWKSet(new URL(keySetUrl));
    jwksCache.set(keySetUrl, set);
  }
  return set;
}

export async function verifyLtiIdToken(
  idToken: string,
  config: LtiToolConfig,
  expectedNonce: string,
): Promise<LtiIdTokenClaims> {
  const { payload } = await jwtVerify(idToken, platformJwks(config.keySetUrl), {
    issuer: config.issuer,
    audience: config.clientId,
    algorithms: ['RS256'],
  });

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('LTI id_token missing sub');
  }
  if (payload.nonce !== expectedNonce) {
    throw new Error('LTI id_token nonce mismatch');
  }

  return payload as LtiIdTokenClaims;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function parseLtiLaunch(claims: LtiIdTokenClaims): ParsedLtiLaunch {
  const deploymentId = asString(claims[LTI_CLAIMS.deploymentId]);
  if (!deploymentId) throw new Error('LTI launch missing deployment_id');

  const rolesRaw = claims[LTI_CLAIMS.roles];
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.filter((r): r is string => typeof r === 'string')
    : [];

  const context = claims[LTI_CLAIMS.context] as
    | { id?: string; label?: string; title?: string }
    | undefined;
  const contextId = asString(context?.id);
  const contextLabel =
    asString(context?.label) || asString(context?.title) || null;

  const resourceLink = claims[LTI_CLAIMS.resourceLink] as
    | { id?: string }
    | undefined;

  const ags = claims[LTI_CLAIMS.agsEndpoint] as
    | { lineitems?: string; lineitem?: string }
    | undefined;
  const nrps = claims[LTI_CLAIMS.nrps] as
    | { context_memberships_url?: string }
    | undefined;

  const custom = asStringRecord(claims[LTI_CLAIMS.custom]);

  // Canvas often puts canvas_course_id in custom; context.id is also usable.
  const canvasCourseId =
    custom.canvas_course_id ||
    custom.course_id ||
    contextId;

  return {
    claims,
    deploymentId,
    roles,
    contextId,
    contextLabel,
    canvasCourseId,
    resourceLinkId: asString(resourceLink?.id),
    agsLineItemsUrl: asString(ags?.lineitems),
    nrpsMembershipsUrl: asString(nrps?.context_memberships_url),
    custom,
    messageType:
      asString(claims[LTI_CLAIMS.messageType]) || 'LtiResourceLinkRequest',
  };
}
