import { NextResponse } from 'next/server';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';

export async function GET() {
  try {
    // Test database connection by querying users table
    const allUsers = await db.select().from(users);
    
    return NextResponse.json({ 
      success: true, 
      userCount: allUsers.length,
      users: allUsers 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 