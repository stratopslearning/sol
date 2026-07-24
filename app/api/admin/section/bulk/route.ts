import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { sections, users } from '@/app/db/schema';
import { generateEnrollmentCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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
    const newSections = await db.transaction(async (tx) => {
      const created = [];
      for (const name of validatedData.names) {
        const professorEnrollmentCode = generateEnrollmentCode();
        const studentEnrollmentCode = generateEnrollmentCode();
        const [section] = await tx
          .insert(sections)
          .values({
            name,
            courseId: validatedData.courseId,
            professorEnrollmentCode,
            studentEnrollmentCode,
          })
          .returning();
        created.push(section);
      }
      return created;
    });
    return NextResponse.json({ success: true, sections: newSections });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create sections' }, { status: 500 });
  }
}
