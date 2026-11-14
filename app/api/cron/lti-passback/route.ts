import { NextRequest, NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/api/cronAuth';
import { jobsBackend } from '@/lib/jobs/backend';
import { enqueueLtiPassbackDrain } from '@/lib/jobs/enqueue';
import { getLtiConfig } from '@/lib/lti/config';
import { processPendingPassbackJobs } from '@/lib/lti/passback';

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

  // Prefer kicking Inngest; always drain inline as the durable cron safety net.
  if (jobsBackend() === 'inngest') {
    void enqueueLtiPassbackDrain(40);
  }
  const result = await processPendingPassbackJobs(40);
  return NextResponse.json({ ...result, backend: jobsBackend() });
}
