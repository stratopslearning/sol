/**
 * Canvas LTI 1.3 Advantage configuration.
 * When LTI_ENABLED is not true, routes return 503 and hooks no-op.
 */
import { absoluteUrl } from '@/lib/siteUrl';

export type LtiToolConfig = {
  enabled: true;
  issuer: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  deploymentId: string;
  toolPrivateKeyPem: string;
  toolPublicKeyPem: string;
  toolKeyId: string;
  platformLabel: string;
  loginUrl: string;
  launchUrl: string;
  jwksUrl: string;
};

export type LtiConfig = LtiToolConfig | { enabled: false };

function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

export function getLtiConfig(): LtiConfig {
  if (process.env.LTI_ENABLED !== 'true') {
    return { enabled: false };
  }

  const issuer = process.env.LTI_ISSUER;
  const clientId = process.env.LTI_CLIENT_ID;
  const authLoginUrl = process.env.LTI_AUTH_LOGIN_URL;
  const authTokenUrl = process.env.LTI_AUTH_TOKEN_URL;
  const keySetUrl = process.env.LTI_KEY_SET_URL;
  const deploymentId = process.env.LTI_DEPLOYMENT_ID;
  const toolPrivateKeyPem = process.env.LTI_TOOL_PRIVATE_KEY;
  const toolPublicKeyPem = process.env.LTI_TOOL_PUBLIC_KEY;
  const toolKeyId = process.env.LTI_TOOL_KEY_ID;

  if (
    !issuer ||
    !clientId ||
    !authLoginUrl ||
    !authTokenUrl ||
    !keySetUrl ||
    !deploymentId ||
    !toolPrivateKeyPem ||
    !toolPublicKeyPem ||
    !toolKeyId
  ) {
    return { enabled: false };
  }

  return {
    enabled: true,
    issuer,
    clientId,
    authLoginUrl,
    authTokenUrl,
    keySetUrl,
    deploymentId,
    toolPrivateKeyPem: normalizePem(toolPrivateKeyPem),
    toolPublicKeyPem: normalizePem(toolPublicKeyPem),
    toolKeyId,
    platformLabel: process.env.LTI_PLATFORM_LABEL?.trim() || 'Canvas',
    loginUrl: absoluteUrl('/api/lti/login'),
    launchUrl: absoluteUrl('/api/lti/launch'),
    jwksUrl: absoluteUrl('/api/lti/jwks'),
  };
}

export function assertLtiEnabled(): LtiToolConfig {
  const cfg = getLtiConfig();
  if (!cfg.enabled) {
    throw new Error('LTI is not enabled on this deployment');
  }
  return cfg;
}

/** IMS LTI claim URIs */
export const LTI_CLAIMS = {
  messageType: 'https://purl.imsglobal.org/spec/lti/claim/message_type',
  version: 'https://purl.imsglobal.org/spec/lti/claim/version',
  deploymentId: 'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
  targetLinkUri: 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri',
  resourceLink: 'https://purl.imsglobal.org/spec/lti/claim/resource_link',
  roles: 'https://purl.imsglobal.org/spec/lti/claim/roles',
  context: 'https://purl.imsglobal.org/spec/lti/claim/context',
  custom: 'https://purl.imsglobal.org/spec/lti/claim/custom',
  lis: 'https://purl.imsglobal.org/spec/lti/claim/lis',
  agsEndpoint: 'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint',
  nrps: 'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice',
} as const;

export const LTI_SCOPES = {
  lineitem: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
  lineitemReadonly:
    'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
  score: 'https://purl.imsglobal.org/spec/lti-ags/scope/score',
  resultReadonly:
    'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
  nrps:
    'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
} as const;
