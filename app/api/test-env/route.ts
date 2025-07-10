import { NextResponse } from 'next/server';

export async function GET() {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasClerkKeys = !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  
  return NextResponse.json({
    environment: {
      hasDatabaseUrl,
      hasClerkKeys,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      clerkPublishableKeyLength: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length || 0,
      clerkSecretKeyLength: process.env.CLERK_SECRET_KEY?.length || 0,
    }
  });
} 