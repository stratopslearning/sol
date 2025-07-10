import { clerkMiddleware } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { users as dbUsers } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  const publicRoutes = ['/', '/login', '/signup', '/api/stripe/webhook'];
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
  if (isPublicRoute) {
    return;
  }

  // Protect all other routes
  const { userId } = await auth();
  if (!userId) {
    return Response.redirect(new URL('/login', req.url));
  }

  // Get user data for role-based access control
  const user = await db.query.users.findFirst({ where: eq(dbUsers.clerkId, userId) });
  if (!user) {
    return Response.redirect(new URL('/login', req.url));
  }

  const url = req.nextUrl.pathname;

  // Restrict unpaid students from /quiz/* and /dashboard/student
  if (url.startsWith('/quiz') || url.startsWith('/dashboard/student')) {
    if (user.role === 'STUDENT' && !user.paid) {
      return Response.redirect(new URL('/payment', req.url));
    }
  }

  // Restrict professor routes to PROFESSOR and ADMIN roles only
  if (url.startsWith('/dashboard/professor')) {
    if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
      return Response.redirect(new URL('/dashboard/student', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};