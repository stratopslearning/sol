/**
 * Signed OIDC state cookie for LTI login → launch (CSRF + nonce binding).
 */
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'sol_lti_oidc';
const TTL_SEC = 600;

export type LtiOidcState = {
  state: string;
  nonce: string;
  iss: string;
  clientId: string;
  loginHint?: string;
  targetLinkUri?: string;
  ltiMessageHint?: string;
};

function stateSecret(): Uint8Array {
  const raw =
    process.env.LTI_TOOL_PRIVATE_KEY ||
    process.env.CLERK_SECRET_KEY ||
    'dev-lti-state-secret';
  return new TextEncoder().encode(raw.slice(0, 64));
}

export async function sealOidcState(payload: LtiOidcState): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SEC}s`)
    .sign(stateSecret());
}

export async function openOidcState(
  token: string,
): Promise<LtiOidcState | null> {
  try {
    const { payload } = await jwtVerify(token, stateSecret());
    if (
      typeof payload.state !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.iss !== 'string' ||
      typeof payload.clientId !== 'string'
    ) {
      return null;
    }
    return {
      state: payload.state,
      nonce: payload.nonce,
      iss: payload.iss,
      clientId: payload.clientId,
      loginHint:
        typeof payload.loginHint === 'string' ? payload.loginHint : undefined,
      targetLinkUri:
        typeof payload.targetLinkUri === 'string'
          ? payload.targetLinkUri
          : undefined,
      ltiMessageHint:
        typeof payload.ltiMessageHint === 'string'
          ? payload.ltiMessageHint
          : undefined,
    };
  } catch {
    return null;
  }
}

export function oidcStateCookieOptions(maxAge = TTL_SEC) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    // SameSite=None requires Secure; use Lax locally so login cookie sticks.
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge,
  };
}

export { COOKIE_NAME as LTI_OIDC_COOKIE };
