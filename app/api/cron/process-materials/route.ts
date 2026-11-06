import { NextRequest, NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/api/cronAuth';
import { processPendingMaterials } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Vercel cron / manual: process stuck PENDING course materials. */
export async function GET(req: NextRequest) {
  const ok =
    isCronAuthorized(req) ||
    (process.env.NODE_ENV !== 'production' && !process.env.CRON_SECRET);
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const processed = await processPendingMaterials(10);
  return NextResponse.json({ ok: true, processed });
}
