import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { BASE_PATH, withBasePath } from '@/lib/basePath';

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

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Recover from accidental double basePath (Link href passed through withBasePath).
  const doubleBase = `${BASE_PATH}${BASE_PATH}`;
  if (pathname.startsWith(doubleBase)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(BASE_PATH.length);
    return NextResponse.redirect(url);
  }

  const appPath = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname;

  // Agent access paths authenticate inside the route handler with a personal
  // access token (`sol_pat_…`) instead of a Clerk cookie, so the edge layer
  // must not bounce them to the login page. Every handler on these paths
  // still enforces auth itself (verifyProfessorApiToken / getOrCreateUser).
  const authHeader = req.headers.get('authorization') ?? '';
  const hasApiToken = authHeader.startsWith('Bearer sol_pat_');
  if (appPath === '/api/mcp' || appPath.startsWith('/api/mcp/')) return;
  if (hasApiToken && appPath.startsWith('/api/professor/')) return;

  const isPublic =
    appPath === '/' ||
    // File-based metadata icon routes (extensionless dynamic ones like
    // /apple-icon aren't excluded by the static-asset matcher below).
    appPath === '/apple-icon' ||
    appPath.startsWith('/apple-icon/') ||
    appPath === '/icon' ||
    appPath.startsWith('/icon/') ||
    appPath === '/login' ||
    appPath.startsWith('/login/') ||
    appPath === '/signup' ||
    appPath.startsWith('/signup/') ||
    appPath === '/api/user' ||
    appPath.startsWith('/api/user/') ||
    appPath === '/api/stripe/product' ||
    appPath.startsWith('/api/stripe/product') ||
    appPath.startsWith('/api/stripe/webhook');

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
