import * as Sentry from '@sentry/nextjs';

import { assertDevOrAdmin } from '@/lib/devGate';

export const dynamic = 'force-dynamic';

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'SentryExampleAPIError';
  }
}

// A faulty API route to test Sentry's error monitoring. Gated so that it is
// not reachable by anonymous traffic in production.
export async function GET() {
  const gate = await assertDevOrAdmin();
  if (gate) return gate;

  Sentry.logger.info('Sentry example API called');
  throw new SentryExampleAPIError(
    'This error is raised on the backend called by the example page.',
  );
}
