import { NextResponse } from 'next/server';

import { assertRuntimeRole } from '@/lib/db/assertRuntimeRole';

export const dynamic = 'force-dynamic';

/**
 * Liveness + runtime DB role guard. Returns 503 when the process is connected
 * with an unsafe database role (bypass RLS, table owner, or MEMBER of owner).
 */
export async function GET() {
  try {
    const role = await assertRuntimeRole();
    if (!role.ok) {
      return NextResponse.json(
        { ok: false, error: role.reason, currentUser: role.currentUser },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      currentUser: role.currentUser,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'health check failed';
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
