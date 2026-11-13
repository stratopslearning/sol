/**
 * Shared OpenAI client factory with optional Braintrust auto-instrumentation.
 */
import OpenAI from 'openai';
import { wrapOpenAI } from 'braintrust';

import { initBraintrustLogger, isBraintrustEnabled } from '@/lib/ai/tracing';

export type CreateOpenAIOptions = {
  maxRetries?: number;
  timeout?: number;
};

export function createOpenAIClient(
  options: CreateOpenAIOptions = {},
): OpenAI {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: options.maxRetries ?? 2,
    timeout: options.timeout ?? 25_000,
  });

  // Skip wrapping in Vitest / when Braintrust is unset. wrapOpenAI expects a
  // real OpenAI SDK instance and breaks on vi.mock('openai') constructors.
  // BRAINTRUST_WRAP=1 opts evals (NODE_ENV=test) back into auto-instrumentation.
  const allowWrap =
    isBraintrustEnabled() &&
    (process.env.NODE_ENV !== 'test' || process.env.BRAINTRUST_WRAP === '1');
  if (allowWrap) {
    initBraintrustLogger();
    return wrapOpenAI(client);
  }

  return client;
}
