import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/app/db';
import { courses, users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateEnrollmentCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Validation schema for course creation
const createCourseSchema = z.object({
  title: z.string().min(1, 'Course title is required').max(100, 'Course title too long'),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to create courses
    const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createCourseSchema.parse(body);

    // Create the course (no enrollment code, no professorId)
    const [newCourse] = await db.insert(courses).values({
      title: validatedData.title,
      description: validatedData.description || null,
      status: 'ACTIVE',
      isActive: true,
    }).returning();

    return NextResponse.json({
      success: true,
      course: {
        id: newCourse.id,
        title: newCourse.title,
        description: newCourse.description,
        status: newCourse.status,
        createdAt: newCourse.createdAt,
      },
      message: 'Course created successfully',
    });

  } catch (error) {
    console.error('Error creating course:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create course' 
    }, { status: 500 });
  }
} 