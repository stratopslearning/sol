import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  isBodyTooLarge,
  isSameOrigin,
  middlewareBodyLimitBytes,
  shouldEnforceSameOrigin,
} from '@/lib/api/sameOrigin';
import { BASE_PATH, withBasePath } from '@/lib/basePath';
import { CAL_BOOKING_URL } from '@/lib/calBooking';
import { isLoadTestRequest } from '@/lib/loadTestAuth';
import {
  classifySolHost,
  isDocsPath,
  isMarketingPath,
  isTrustPath,
  solDemoOnly,
  solHostsConfigured,
  solOrigin,
  type SolHostRole,
} from '@/lib/solHosts';

/**
 * Clerk middleware runs on Vercel's Edge runtime. That means we CANNOT import
 * anything that ultimately drags in Node-only modules — `@/app/db` pulls in
 * `ws` and the Neon `Pool` driver, both of which crash the edge bundle at
 * module-load time and produce `MIDDLEWARE_INVOCATION_FAILED` 500s on every
 * request. Keep this file edge-safe and push role/paid enforcement down into
 * the page layouts and API routes via `lib/auth.ts` (`requireAuth`,
 * `requireAdmin`, `requireProfessor`, `requireStudent`).
 */

function redirectWithinApp(path: string, req: Request) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return NextResponse.redirect(new URL(withBasePath(p), req.url));
}

function redirectToSolHost(role: SolHostRole, path: string, search: string) {
  const origin = solOrigin(role);
  if (!origin) return null;
  const url = new URL(`${origin}${path === '/' ? '/' : path}${search}`);
  return NextResponse.redirect(url);
}

/**
 * Sol multi-subdomain map (only when BASE_PATH is empty and SOL_* hosts are set).
 * StratOps `/learning` skips this entirely.
 */
function solHostRedirect(req: {
  nextUrl: { pathname: string; search: string };
  headers: { get(name: string): string | null };
}): NextResponse | null {
  if (BASE_PATH || !solHostsConfigured()) return null;

  const hostHeader = req.headers.get('host') ?? '';
  const role = classifySolHost(hostHeader);
  if (!role) return null;

  const path = req.nextUrl.pathname;
  const search = req.nextUrl.search;

  // Shared public probes — allow on any Sol host (rewritten below).
  if (path.startsWith('/.well-known/') || path.startsWith('/well-known/')) {
    return null;
  }

  if (role === 'marketing') {
    if (isMarketingPath(path)) return null;
    if (isDocsPath(path)) return redirectToSolHost('docs', path, search);
    if (isTrustPath(path)) return redirectToSolHost('trust', path, search);
    return redirectToSolHost('app', path, search);
  }

  if (role === 'docs') {
    if (isDocsPath(path)) return null;
    if (path === '/' || path.startsWith('/#')) {
      return redirectToSolHost('marketing', '/', search);
    }
    if (isTrustPath(path)) return redirectToSolHost('trust', path, search);
    if (isMarketingPath(path)) {
      return redirectToSolHost('marketing', path, search);
    }
    return redirectToSolHost('app', path, search);
  }

  if (role === 'trust') {
    if (isTrustPath(path)) return null;
    if (path === '/' || path.startsWith('/#')) {
      return redirectToSolHost('marketing', '/', search);
    }
    if (isDocsPath(path)) return redirectToSolHost('docs', path, search);
    if (isMarketingPath(path)) {
      return redirectToSolHost('marketing', path, search);
    }
    return redirectToSolHost('app', path, search);
  }

  // app.
  if (path === '/' || path.startsWith('/#')) {
    return redirectToSolHost('marketing', path === '/' ? '/' : path, search);
  }
  if (isDocsPath(path)) return redirectToSolHost('docs', path, search);
  if (isTrustPath(path)) return redirectToSolHost('trust', path, search);
  return null;
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  const hostGate = solHostRedirect(req);
  if (hostGate) return hostGate;

  // teachwithsol: no public auth — send login/signup to Book a demo.
  if (
    solDemoOnly() &&
    (pathname === '/login' ||
      pathname.startsWith('/login/') ||
      pathname === '/signup' ||
      pathname.startsWith('/signup/'))
  ) {
    return NextResponse.redirect(CAL_BOOKING_URL);
  }

  // OAuth discovery (RFC 8414 / RFC 9728) is probed at the site apex
  // (e.g. /.well-known/oauth-protected-resource/learning/api/mcp) and under
  // the basePath. The App Router cannot own a dot-directory (`.well-known`
  // segments are not routable on this Next version), so both public forms
  // are rewritten onto the internal `/well-known/*` routes. Note
  // `nextUrl.pathname` already has the basePath stripped, so both forms
  // present identically here; use a plain URL to avoid NextURL re-adding
  // the basePath on serialization.
  if (pathname.startsWith('/.well-known/')) {
    const rest = pathname.slice('/.well-known/'.length);
    const dest = `${BASE_PATH}/well-known/${rest}${req.nextUrl.search}`;
    return NextResponse.rewrite(new URL(dest, req.url));
  }

  // Recover from accidental double basePath (StratOps only — empty BASE_PATH
  // must not run startsWith("") which matches every pathname).
  if (BASE_PATH) {
    const doubleBase = `${BASE_PATH}${BASE_PATH}`;
    if (pathname.startsWith(doubleBase)) {
      return NextResponse.redirect(
        new URL(`${pathname.slice(BASE_PATH.length)}${req.nextUrl.search}`, req.url),
      );
    }
    if (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`)) {
      const stripped = pathname.slice(BASE_PATH.length) || '/';
      return NextResponse.redirect(
        new URL(`${BASE_PATH}${stripped}${req.nextUrl.search}`, req.url),
      );
    }
  }

  const appPath =
    BASE_PATH &&
    (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))
      ? pathname.slice(BASE_PATH.length) || '/'
      : pathname;

  // Markdown mirrors for public docs (llmstxt.org): /docs.md and /docs/:slug.md
  if (appPath === '/docs.md' || appPath === '/docs/index.md') {
    return NextResponse.rewrite(
      new URL(`${BASE_PATH}/docs/md/index${req.nextUrl.search}`, req.url),
    );
  }
  const docsMdMatch = appPath.match(/^\/docs\/([^/]+)\.md$/);
  if (docsMdMatch) {
    return NextResponse.rewrite(
      new URL(
        `${BASE_PATH}/docs/md/${docsMdMatch[1]}${req.nextUrl.search}`,
        req.url,
      ),
    );
  }

  // Agent access paths authenticate inside the route handler with a personal
  // access token (`sol_pat_…`) instead of a Clerk cookie, so the edge layer
  // must not bounce them to the login page. Every handler on these paths
  // still enforces auth itself (verifyProfessorApiToken / getOrCreateUser).
  const authHeader = req.headers.get('authorization') ?? '';
  const hasApiToken = authHeader.startsWith('Bearer sol_pat_');
  const loadTest = isLoadTestRequest(req.headers);

  // CSRF: cookie-authenticated mutating /api/* must be same-origin.
  // Bearer PAT / MCP / cron / webhooks / load-test stay exempt.
  if (
    shouldEnforceSameOrigin(req.method, appPath, authHeader || null, loadTest)
  ) {
    if (!isSameOrigin(req)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'csrf_origin' },
        { status: 403 },
      );
    }
  }

  // Cheap early reject for oversized API bodies (chunked bodies are checked
  // again in readJsonBody / route handlers). Materials + H5P allow 10 MB.
  if (
    appPath.startsWith('/api/') &&
    shouldEnforceSameOrigin(req.method, appPath, authHeader || null, loadTest) &&
    isBodyTooLarge(
      req.headers.get('content-length'),
      middlewareBodyLimitBytes(appPath),
    )
  ) {
    return NextResponse.json(
      { error: 'Payload too large', code: 'payload_too_large' },
      { status: 413 },
    );
  }

  if (appPath === '/api/mcp' || appPath.startsWith('/api/mcp/')) return;
  if (hasApiToken && appPath.startsWith('/api/professor/')) return;

  // k6 impersonation: skip the Clerk login redirect. The Node handler still
  // authenticates via x-load-test-* headers in getOrCreateUser. Hard-disabled
  // when VERCEL_ENV=production (see lib/loadTestAuth.ts).
  if (loadTest) return;

  // OAuth discovery metadata (RFC 8414 / RFC 9728) must be fetchable without
  // a session — Claude.ai / ChatGPT read it before any user is signed in.
  // (/.well-known/* rewrites above bypass this; this covers direct hits.)
  if (appPath.startsWith('/well-known/')) return;

  const isPublic =
    appPath === '/' ||
    // File-based metadata icon routes (extensionless dynamic ones like
    // /apple-icon aren't excluded by the static-asset matcher below).
    appPath === '/apple-icon' ||
    appPath.startsWith('/apple-icon/') ||
    appPath === '/icon' ||
    appPath.startsWith('/icon/') ||
    appPath === '/opengraph-image' ||
    appPath.startsWith('/opengraph-image/') ||
    appPath === '/twitter-image' ||
    appPath.startsWith('/twitter-image/') ||
    appPath === '/docs' ||
    appPath.startsWith('/docs/') ||
    appPath === '/docs.md' ||
    appPath === '/privacy' ||
    appPath === '/terms' ||
    appPath === '/security' ||
    appPath === '/dmca' ||
    appPath === '/unsubscribe' ||
    appPath === '/api/demo-request' ||
    appPath === '/llms.txt' ||
    appPath === '/robots.txt' ||
    appPath === '/sitemap.xml' ||
    appPath === '/login' ||
    appPath.startsWith('/login/') ||
    appPath === '/signup' ||
    appPath.startsWith('/signup/') ||
    appPath === '/api/user' ||
    appPath.startsWith('/api/user/') ||
    appPath === '/api/stripe/product' ||
    appPath.startsWith('/api/stripe/product') ||
    appPath.startsWith('/api/stripe/webhook') ||
    appPath.startsWith('/api/clerk/webhook') ||
    // LTI 1.3 OIDC login/launch/JWKS (Canvas posts cross-site; no Clerk session yet).
    appPath === '/api/lti' ||
    appPath.startsWith('/api/lti/') ||
    appPath === '/lti/bridge' ||
    appPath.startsWith('/lti/bridge/') ||
    // Cron authenticates with CRON_SECRET in the route handler — must not
    // bounce to /login before that check runs.
    appPath === '/api/cron' ||
    appPath.startsWith('/api/cron/');

  if (isPublic) return;

  const { userId } = await auth();
  if (!userId) {
    return redirectWithinApp('/login', req);
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
