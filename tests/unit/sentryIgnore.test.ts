import { describe, expect, it } from 'vitest';

import {
  sentryEventMessage,
  shouldIgnoreSentryMessage,
} from '@/lib/sentryIgnore';

describe('shouldIgnoreSentryMessage', () => {
  it('drops Clerk session and FAPI noise', () => {
    expect(shouldIgnoreSentryMessage('You are signed out')).toBe(true);
    expect(
      shouldIgnoreSentryMessage(
        'An unexpected response was received from the server.',
      ),
    ).toBe(true);
    expect(
      shouldIgnoreSentryMessage(
        "TypeError: undefined is not an object (evaluating 'e.execute')",
      ),
    ).toBe(true);
  });

  it('drops JSON-LD, Replay worker, ResizeObserver, and hydration noise', () => {
    expect(
      shouldIgnoreSentryMessage(
        'undefined is not an object (evaluating \'r["@context"].toLowerCase\')',
      ),
    ).toBe(true);
    expect(
      shouldIgnoreSentryMessage(
        "Uncaught NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'",
      ),
    ).toBe(true);
    expect(
      shouldIgnoreSentryMessage('ResizeObserver loop limit exceeded'),
    ).toBe(true);
    expect(
      shouldIgnoreSentryMessage(
        "Hydration failed because the server rendered HTML didn't match the client.",
      ),
    ).toBe(true);
  });

  it('keeps real application errors', () => {
    expect(shouldIgnoreSentryMessage('Failed to start quiz')).toBe(false);
    expect(
      shouldIgnoreSentryMessage('Connection terminated unexpectedly'),
    ).toBe(false);
  });
});

describe('sentryEventMessage', () => {
  it('prefers exception values over the top-level message', () => {
    expect(
      sentryEventMessage({
        message: 'wrapper',
        exception: {
          values: [{ type: 'TypeError', value: 'You are signed out' }],
        },
      }),
    ).toBe('TypeError: You are signed out');
  });
});
