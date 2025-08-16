import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { users as dbUsers } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';

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
 * Gets or creates a user in the database based on Clerk authentication
 * This function syncs Clerk userId and details to our NeonDB for business logic
 */
export async function getOrCreateUser(): Promise<UserData | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    // Check if user already exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(dbUsers.clerkId, userId),
    });
    if (existingUser) return existingUser as UserData;

    // Fetch user details from Clerk backend API
    let email = '';
    let firstName = null;
    let lastName = null;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
      firstName = clerkUser.firstName || null;
      lastName = clerkUser.lastName || null;
    } catch (e) {
      // fallback: leave as null/empty
    }

    // Create new user in our database
    const [newUser] = await db.insert(dbUsers).values({
      clerkId: userId,
      email,
      firstName,
      lastName,
      role: 'STUDENT',
      paid: false,
    }).returning();

    return newUser as UserData;
  } catch (error) {
    console.error('❌ Error in getOrCreateUser:', error);
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
    console.error('Error in getUser:', error);
    return null;
  }
}

/**
 * Updates user data in the database
 */
export async function updateUser(updates: Partial<Pick<UserData, 'role' | 'paid' | 'firstName' | 'lastName'>>): Promise<UserData | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const [updatedUser] = await db.update(dbUsers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(dbUsers.clerkId, userId))
      .returning();
    return updatedUser as UserData;
  } catch (error) {
    console.error('Error in updateUser:', error);
    return null;
  }
} 