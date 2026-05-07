import { NextResponse } from 'next/server';

import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { assertDevOrAdmin } from '@/lib/devGate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await assertDevOrAdmin();
  if (gate) return gate;

  try {
    const allUsers = await db.select().from(users);

    return NextResponse.json({
      success: true,
      userCount: allUsers.length,
      // Do not return the full users array — it would leak PII even to admins
      // in production logs / browser history. Caller can hit an admin-scoped
      // user listing endpoint if they need details.
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
