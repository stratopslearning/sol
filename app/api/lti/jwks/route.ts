import { NextResponse } from 'next/server';

import { getToolJwks } from '@/lib/lti/keys';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jwks = await getToolJwks();
  return NextResponse.json(jwks, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
