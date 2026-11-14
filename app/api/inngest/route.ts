import { serve } from 'inngest/next';

import { inngest, solInngestFunctions } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Grading / embed jobs may run longer than default. */
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: solInngestFunctions,
});
