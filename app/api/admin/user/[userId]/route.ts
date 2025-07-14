import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

const updateUserSchema = z.object({
  role: z.enum(['STUDENT', 'PROFESSOR', 'ADMIN']).optional(),
  paid: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { userId: adminId } = await auth();
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await db.query.users.findFirst({ where: eq(users.clerkId, adminId) });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    // Extract userId from the URL
    const urlParts = req.nextUrl.pathname.split('/');
    const userId = urlParts[urlParts.length - 2];
    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);
    const [updatedUser] = await db.update(users)
      .set(validatedData)
      .where(eq(users.id, userId))
      .returning();
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
} 