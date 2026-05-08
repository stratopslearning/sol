import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { users as dbUsers } from '@/app/db/schema';

/**
 * Next.js signals "this page must be dynamic" by throwing internal errors with
 * a `digest` like `DYNAMIC_SERVER_USAGE` or `NEXT_REDIRECT` during static
 * prerender. Those are control flow, not real failures, and the framework
 * expects them to bubble. Catching/logging them pollutes build output and can
 * also swallow `redirect()` from server helpers.
 */
function isNextInternalError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== 'string') return false;
  return (
    digest === 'DYNAMIC_SERVER_USAGE' ||
    digest === 'NEXT_NOT_FOUND' ||
    digest.startsWith('NEXT_REDIRECT')
  );
}

export interface UserData {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  paid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gets or creates a user in the database based on Clerk authentication.
 * Syncs the Clerk userId / profile fields into our database for business logic.
 *
 * Implementation notes:
 *   - We use Postgres `INSERT ... ON CONFLICT (clerk_id) DO UPDATE` so that
 *     two concurrent requests from the same fresh user (e.g. dashboard +
 *     navigation) do not race to create duplicate rows. The unique index on
 *     `clerk_id` is what makes this safe.
 *   - Clerk profile fields (email, names) are refreshed on every login since
 *     the user can change them on Clerk's side and we don't want to drift.
 *     `role` and `paid` are NEVER touched here — those are managed by admins
 *     and the Stripe webhook respectively.
 */
export async function getOrCreateUser(): Promise<UserData | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    // Fast path: row already exists. Only the read is needed for the common case.
    const existingUser = await db.query.users.findFirst({
      where: eq(dbUsers.clerkId, userId),
    });
    if (existingUser) return existingUser as UserData;

    // Slow path: fetch profile from Clerk and upsert. We tolerate Clerk failures
    // by falling back to placeholder values, but we still create the row so the
    // request can proceed (the user can update their profile later).
    let email = '';
    let firstName: string | null = null;
    let lastName: string | null = null;
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
      firstName = clerkUser.firstName || null;
      lastName = clerkUser.lastName || null;
    } catch (e) {
      console.warn('Failed to fetch Clerk user profile during sync', e);
    }

    const [upserted] = await db
      .insert(dbUsers)
      .values({
        clerkId: userId,
        email,
        firstName,
        lastName,
        role: 'STUDENT',
        paid: false,
      })
      .onConflictDoUpdate({
        target: dbUsers.clerkId,
        // Only refresh profile metadata. Role and paid are governed elsewhere.
        set: {
          email,
          firstName,
          lastName,
          updatedAt: new Date(),
        },
      })
      .returning();

    return upserted as UserData;
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error('Error in getOrCreateUser:', error);
    return null;
  }
}

/**
 * Gets user data without creating if not exists
 */
export async function getUser(): Promise<UserData | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const user = await db.query.users.findFirst({
      where: eq(dbUsers.clerkId, userId),
    });
    return user as UserData | null;
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error('Error in getUser:', error);
    return null;
  }
}

/**
 * Updates user data in the database
 */
export async function updateUser(
  updates: Partial<Pick<UserData, 'role' | 'paid' | 'firstName' | 'lastName'>>,
): Promise<UserData | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const [updatedUser] = await db
      .update(dbUsers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(dbUsers.clerkId, userId))
      .returning();
    return updatedUser as UserData;
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error('Error in updateUser:', error);
    return null;
  }
}
