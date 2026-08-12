import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq, sql } from 'drizzle-orm';

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

/** Public client payload — never includes stripeCustomerId / lastSyncedAt. */
export type PublicUserDto = Pick<
  UserData,
  'id' | 'role' | 'paid' | 'firstName' | 'lastName' | 'email'
>;

export function toUserData(row: {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  paid: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserData {
  return {
    id: row.id,
    clerkId: row.clerkId,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    paid: row.paid,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicUserDto(user: UserData): PublicUserDto {
  return {
    id: user.id,
    role: user.role,
    paid: user.paid,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}

/**
 * Gets or creates a user in the database based on Clerk authentication.
 * Syncs the Clerk userId / profile fields into our database for business logic.
 *
 * Implementation notes:
 *   - Lookup by `clerk_id` first (common path).
 *   - If missing, look up by email (case-insensitive) and **relink** the row to
 *     the current Clerk id. This repairs orphans after a Clerk user was deleted
 *     and recreated without creating a second SOL profile.
 *   - Insert uses `ON CONFLICT (clerk_id) DO UPDATE` for concurrent first logins.
 *   - Partial unique index on `lower(email)` prevents duplicate non-empty emails.
 *   - `role` and `paid` are NEVER overwritten on sync — admins / Stripe own those.
 */
export async function getOrCreateUser(): Promise<UserData | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    return await getOrCreateUserByClerkId(userId);
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error('Error in getOrCreateUser:', error);
    return null;
  }
}

/**
 * Same upsert as `getOrCreateUser`, but for callers that already resolved the
 * Clerk user id themselves (e.g. the MCP OAuth bearer path, where there is no
 * Clerk session cookie — `auth({ acceptsToken: 'oauth_token' })` returns the
 * token subject instead).
 */
export async function getOrCreateUserByClerkId(
  userId: string,
): Promise<UserData | null> {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(dbUsers.clerkId, userId),
    });
    if (existingUser) return toUserData(existingUser);

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

    // Relink orphan row that already owns this email under a stale clerk_id.
    if (email) {
      const byEmail = await db.query.users.findFirst({
        where: sql`lower(${dbUsers.email}) = ${email.toLowerCase()}`,
      });
      if (byEmail) {
        const [relinked] = await db
          .update(dbUsers)
          .set({
            clerkId: userId,
            email,
            firstName: firstName ?? byEmail.firstName,
            lastName: lastName ?? byEmail.lastName,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(dbUsers.id, byEmail.id))
          .returning();
        return toUserData(relinked);
      }
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
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: dbUsers.clerkId,
        set: {
          email,
          firstName,
          lastName,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return toUserData(upserted);
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error('Error in getOrCreateUserByClerkId:', error);
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
    return user ? toUserData(user) : null;
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
    return updatedUser ? toUserData(updatedUser) : null;
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error('Error in updateUser:', error);
    return null;
  }
}
