import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/express';

// Validation schema for user import data
const userImportSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['STUDENT', 'PROFESSOR', 'ADMIN']),
  paid: z.boolean().default(false),
});

const bulkImportSchema = z.object({
  users: z.array(userImportSchema),
});

interface ImportResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const { userId: adminId } = await auth();
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const admin = await db.query.users.findFirst({ 
      where: eq(users.clerkId, adminId) 
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Admin access required' 
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = bulkImportSchema.parse(body);
    
    if (validatedData.users.length === 0) {
      return NextResponse.json({ 
        error: 'No users provided for import' 
      }, { status: 400 });
    }

    // Limit batch size for performance
    if (validatedData.users.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 users can be imported at once' 
      }, { status: 400 });
    }

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userData of validatedData.users) {
      try {
        // Check if user already exists in our database
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, userData.email),
        });

        if (existingUser) {
          results.push({
            success: false,
            message: `User with email ${userData.email} already exists`,
            details: { email: userData.email }
          });
          errorCount++;
          continue;
        }

        // Create user in Clerk
        let clerkUser;
        try {
          clerkUser = await clerkClient.users.createUser({
            emailAddress: [userData.email],
            firstName: userData.firstName || undefined,
            lastName: userData.lastName || undefined,
            skipPasswordRequirement: true, // Users will set password via email verification
            skipPasswordChecks: true,
          });
        } catch (clerkError: any) {
          // Handle Clerk-specific errors
          if (clerkError.errors?.[0]?.code === 'form_identifier_exists') {
            results.push({
              success: false,
              message: `User with email ${userData.email} already exists in Clerk`,
              details: { email: userData.email, error: 'Email already exists in Clerk' }
            });
          } else {
            results.push({
              success: false,
              message: `Failed to create user in Clerk: ${clerkError.message || 'Unknown error'}`,
              details: { email: userData.email, error: clerkError.message }
            });
          }
          errorCount++;
          continue;
        }

        // Create user in our database
        const [dbUser] = await db.insert(users).values({
          clerkId: clerkUser.id,
          email: userData.email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          role: userData.role,
          paid: userData.paid,
        }).returning();

        results.push({
          success: true,
          message: `Successfully created user ${userData.email} as ${userData.role}`,
          details: { 
            email: userData.email, 
            role: userData.role, 
            dbId: dbUser.id,
            clerkId: clerkUser.id 
          }
        });
        successCount++;

      } catch (error: any) {
        console.error(`Error processing user ${userData.email}:`, error);
        results.push({
          success: false,
          message: `Failed to process user ${userData.email}: ${error.message || 'Unknown error'}`,
          details: { email: userData.email, error: error.message }
        });
        errorCount++;
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Import completed. ${successCount} users created, ${errorCount} failed.`,
      successCount,
      errorCount,
      results,
      totalProcessed: validatedData.users.length
    });

  } catch (error) {
    console.error('Error in bulk user import:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to process bulk import' 
    }, { status: 500 });
  }
}

// GET endpoint to provide import template and status
export async function GET() {
  try {
    // Verify admin authentication
    const { userId: adminId } = await auth();
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const admin = await db.query.users.findFirst({ 
      where: eq(users.clerkId, adminId) 
    });
    
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Admin access required' 
      }, { status: 403 });
    }

    // Return import template and instructions
    return NextResponse.json({
      success: true,
      template: {
        headers: ['email', 'firstName', 'lastName', 'role', 'paid'],
        example: [
          {
            email: 'john.doe@university.edu',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT',
            paid: false
          },
          {
            email: 'jane.smith@university.edu',
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'PROFESSOR',
            paid: false
          }
        ],
        instructions: [
          'email: Required, must be a valid email address',
          'firstName: Optional, user\'s first name',
          'lastName: Optional, user\'s last name',
          'role: Required, must be STUDENT, PROFESSOR, or ADMIN',
          'paid: Optional, true/false or 1/0, defaults to false'
        ]
      }
    });

  } catch (error) {
    console.error('Error in bulk import template request:', error);
    return NextResponse.json({ 
      error: 'Failed to get import template' 
    }, { status: 500 });
  }
}
