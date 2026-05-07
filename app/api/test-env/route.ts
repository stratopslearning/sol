import { NextResponse } from 'next/server';

import { assertDevOrAdmin } from '@/lib/devGate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await assertDevOrAdmin();
  if (gate) return gate;

  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasClerkKeys = !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );

  return NextResponse.json({
    environment: {
      hasDatabaseUrl,
      hasClerkKeys,
      // Length only — never echo the values themselves, even in dev, since
      // they tend to end up in screenshots and chat logs.
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      clerkPublishableKeyLength:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length || 0,
      clerkSecretKeyLength: process.env.CLERK_SECRET_KEY?.length || 0,
    },
  });
}
