/**
 * Same-origin CSRF defense for cookie-authenticated mutating requests.
 *
 * Clerk session cookies are HttpOnly + Secure + SameSite, which already
 * blocks most cross-site POSTs. This guard adds an explicit Origin/Referer
 * allowlist so a misconfigured SameSite or a non-browser client that still
 * carries cookies cannot mutate state from a foreign origin.
 *
 * Bearer-authenticated paths (PAT, MCP OAuth, cron, Stripe/Clerk webhooks)
 * must stay exempt — they have no cookies and authenticating callers are
 * not browsers on our origin.
 */

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Default max Content-Length for /api/* mutations checked at the edge. */
export const MIDDLEWARE_MAX_BODY_BYTES = 1_048_576; // 1 MB

export function isMutatingMethod(method: string): boolean {
  return MUTATING.has(method.toUpperCase());
}

/**
 * Paths that authenticate without a browser cookie session and therefore
 * must not require a same-origin Origin/Referer.
 */
export function isOriginExemptPath(appPath: string): boolean {
  if (appPath.startsWith('/api/stripe/webhook')) return true;
  if (appPath.startsWith('/api/clerk/webhook')) return true;
  if (appPath === '/api/cron' || appPath.startsWith('/api/cron/')) return true;
  if (appPath === '/api/mcp' || appPath.startsWith('/api/mcp/')) return true;
  return false;
}

/**
 * Build the set of allowed origins for this deployment.
 * Edge-safe: only reads process.env, no Node modules.
 */
export function allowedOrigins(): string[] {
  const origins = new Set<string>();

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (base) origins.add(base);

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, '');
  if (vercel) {
    origins.add(
      vercel.startsWith('http') ? vercel : `https://${vercel}`,
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return [...origins];
}

function originFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Returns true when the request Origin (or Referer origin) is in the
 * allowlist. Missing both headers fails closed for mutating cookie requests
 * — legitimate same-origin fetches from modern browsers always send Origin
 * on POST/PUT/PATCH/DELETE.
 */
export function isSameOrigin(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const allowed = allowedOrigins();
  if (allowed.length === 0) {
    // Misconfigured deploy with no base URL — fail closed in production,
    // allow in test/dev so unit tests and local tools still work.
    return process.env.NODE_ENV !== 'production';
  }

  const origin = req.headers.get('origin');
  if (origin) {
    return allowed.includes(origin.replace(/\/$/, ''));
  }

  const fromReferer = originFromReferer(req.headers.get('referer'));
  if (fromReferer) {
    return allowed.includes(fromReferer.replace(/\/$/, ''));
  }

  return false;
}

/**
 * Whether middleware should enforce the same-origin check on this request.
 * Exemptions: safe methods, origin-exempt paths, Bearer PAT / load-test.
 */
export function shouldEnforceSameOrigin(
  method: string,
  appPath: string,
  authHeader: string | null,
  isLoadTest: boolean,
): boolean {
  if (!isMutatingMethod(method)) return false;
  if (!appPath.startsWith('/api/')) return false;
  if (isOriginExemptPath(appPath)) return false;
  if (isLoadTest) return false;
  if (authHeader?.startsWith('Bearer sol_pat_')) return false;
  // Clerk OAuth access tokens on professor routes (rare; MCP is already exempt)
  if (
    authHeader?.startsWith('Bearer ') &&
    !authHeader.startsWith('Bearer sol_pat_') &&
    appPath.startsWith('/api/professor/')
  ) {
    // Could be a Clerk session JWT sent as Bearer — still cookie-primary for
    // dashboard. Only skip when it looks like a PAT (handled above). Keep
    // enforcing for cookie sessions; Bearer without sol_pat_ still goes
    // through Clerk cookie path in practice. Do not exempt.
  }
  return true;
}

/**
 * Early Content-Length reject for oversized API bodies.
 * Returns true when the request should be rejected with 413.
 */
export function isBodyTooLarge(
  contentLength: string | null,
  maxBytes: number = MIDDLEWARE_MAX_BODY_BYTES,
): boolean {
  if (!contentLength) return false;
  const n = Number(contentLength);
  if (!Number.isFinite(n) || n < 0) return false;
  return n > maxBytes;
}
