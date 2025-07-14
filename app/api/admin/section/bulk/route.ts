import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { sections, users } from '@/app/db/schema';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

function generateEnrollmentCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const bulkSectionSchema = z.object({
  names: z.array(z.string().min(1)),
  courseId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    const body = await req.json();
    const validatedData = bulkSectionSchema.parse(body);
    const newSections = await Promise.all(
      validatedData.names.map(async (name: string) => {
        const professorEnrollmentCode = generateEnrollmentCode();
        const studentEnrollmentCode = generateEnrollmentCode();
        const [section] = await db.insert(sections).values({
          name,
          courseId: validatedData.courseId,
          professorEnrollmentCode,
          studentEnrollmentCode,
        }).returning();
        return section;
      })
    );
    return NextResponse.json({ success: true, sections: newSections });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create sections' }, { status: 500 });
  }
} 