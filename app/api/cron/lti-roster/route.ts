import { NextRequest, NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/api/cronAuth';
import { getLtiConfig } from '@/lib/lti/config';
import { syncAllLinkedRosters } from '@/lib/lti/nrps';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cfg = getLtiConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ skipped: true, reason: 'lti_disabled' });
  }

  const results = await syncAllLinkedRosters();
  return NextResponse.json({ synced: results.length, results });
}
