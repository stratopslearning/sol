import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/app/db';
import { users as dbUsers } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { BASE_PATH, withBasePath } from '@/lib/basePath';
import { paymentsEnabled } from '@/lib/featureFlags';

function redirectWithinApp(path: string, req: Request) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return NextResponse.redirect(new URL(withBasePath(p), req.url));
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  // With Next.js `basePath`, middleware can see paths with or without the basePath.
  const appPath = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname;

  const isPublic =
    appPath === '/' ||
    appPath === '/login' ||
    appPath.startsWith('/login/') ||
    appPath === '/signup' ||
    appPath.startsWith('/signup/') ||
    // Allow the frontend to query user state without getting redirected to an HTML login page.
    // During first login, the DB row might not exist yet; we want `/api/user` to return JSON 404 instead.
    appPath === '/api/user' ||
    appPath.startsWith('/api/user/') ||
    // Payment product details must be public so the payment page can render.
    appPath === '/api/stripe/product' ||
    appPath.startsWith('/api/stripe/product') ||
    appPath.startsWith('/api/stripe/webhook');

  if (isPublic) {
    return;
  }

  const { userId } = await auth();
  if (!userId) {
    return redirectWithinApp('/login', req);
  }

  const user = await db.query.users.findFirst({ where: eq(dbUsers.clerkId, userId) });
  if (!user) {
    return redirectWithinApp('/login', req);
  }

  if (appPath.startsWith('/quiz') || appPath.startsWith('/dashboard/student')) {
    // Paywall — only enforced when the payments feature flag is on. While
    // disabled, every authenticated student is treated as entitled.
    if (paymentsEnabled() && user.role === 'STUDENT' && !user.paid) {
      return redirectWithinApp('/payment', req);
    }
  }

  if (appPath.startsWith('/dashboard/professor')) {
    if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
      return redirectWithinApp('/dashboard/student', req);
    }
  }

  if (appPath.startsWith('/dashboard/admin') || appPath.startsWith('/api/admin')) {
    if (user.role !== 'ADMIN') {
      return redirectWithinApp('/dashboard/' + user.role.toLowerCase(), req);
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
