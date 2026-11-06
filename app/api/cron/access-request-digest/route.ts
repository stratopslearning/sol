import { NextRequest, NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/api/cronAuth';
import { runAccessRequestDigests } from '@/lib/email/accessRequestDigest';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAccessRequestDigests();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/access-request-digest]', error);
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 });
  }
}
