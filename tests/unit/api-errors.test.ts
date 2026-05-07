/**
 * Verify the standardized API error response envelope. This is the contract
 * the client + Sentry rely on, so accidental shape drift breaks observability.
 */
import { describe, expect, it } from 'vitest';
import { ZodError, z } from 'zod';

import { ApiError, apiErrorResponse, jsonError } from '@/lib/api/errors';

describe('lib/api/errors', () => {
  it('serializes ApiError fields onto the response body', async () => {
    const res = jsonError(
      ApiError.badRequest('Bad payload', [{ path: 'email', message: 'invalid' }]),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Bad payload');
    expect(body.code).toBe('bad_request');
    expect(body.details).toBeTruthy();
  });

  it('wraps ZodError as a 400 with details', async () => {
    let thrown: ZodError | null = null;
    try {
      z.object({ a: z.string() }).parse({});
    } catch (e) {
      thrown = e as ZodError;
    }
    expect(thrown).toBeInstanceOf(ZodError);
    const res = apiErrorResponse(thrown!);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('bad_request');
    expect(body.details).toBeTruthy();
  });

  it('hides internal error messages on unknown errors', async () => {
    const res = apiErrorResponse(new Error('Database password leaked: hunter2'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('includes extras on tooMany responses', async () => {
    const res = jsonError(ApiError.tooMany('Slow down', { retryAfterSeconds: 30 }));
    const body = await res.json();
    expect(body.code).toBe('rate_limited');
    expect(body.retryAfterSeconds).toBe(30);
  });
});
