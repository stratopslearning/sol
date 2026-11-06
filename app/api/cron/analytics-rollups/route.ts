import { NextRequest, NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/api/cronAuth';
import { computeAllAnalyticsRollups } from '@/lib/analytics/computeRollups';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await computeAllAnalyticsRollups({ limit: 300 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/analytics-rollups]', error);
    return NextResponse.json({ error: 'cron failed' }, { status: 500 });
  }
}
