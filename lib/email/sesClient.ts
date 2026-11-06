import { SESv2Client } from '@aws-sdk/client-sesv2';

import { env } from '@/lib/env';

let cached: SESv2Client | null = null;

export function getSesClient(): SESv2Client {
  if (cached) return cached;
  const region = env().AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION is required for SES');
  }
  cached = new SESv2Client({ region });
  return cached;
}
