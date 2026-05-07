import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';

import { getOrCreateUser } from '@/lib/getOrCreateUser';

/**
 * Gate diagnostic / debug API routes so that in production they are only
 * reachable by an authenticated admin. In development we leave them open for
 * local debugging.
 *
 * Usage in a route handler:
 *
 *   const gate = await assertDevOrAdmin();
 *   if (gate) return gate; // 404/401/403 response — bail out.
 *
 * Returns a NextResponse to short-circuit, or `null` if the request is allowed
 * to continue.
 */
export async function assertDevOrAdmin(): Promise<NextResponse | null> {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    return null;
  }

  // In production, require an authenticated admin user.
  const user = await getOrCreateUser();
  if (!user) {
    // Pretend the route doesn't exist to avoid leaking its existence.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}

/**
 * Page-level gate. Use from a server component / route layout. In production,
 * non-admin callers get a 404. In development everyone is allowed through.
 */
export async function requireDevOrAdminPage(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const user = await getOrCreateUser();
  if (!user || user.role !== 'ADMIN') {
    notFound();
  }
}

