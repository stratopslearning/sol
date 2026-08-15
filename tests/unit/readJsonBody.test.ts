import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { readJsonBody, readJsonBodyOptional } from '@/lib/api/readJsonBody';
import { sanitizeStoredText } from '@/lib/api/sanitizeStoredText';

function makeReq(
  body: string,
  headers: Record<string, string> = { 'content-type': 'application/json' },
): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: {
      ...headers,
      'content-length': String(Buffer.byteLength(body)),
    },
    body,
  });
}

describe('readJsonBody', () => {
  it('parses valid JSON', async () => {
    const data = await readJsonBody(makeReq('{"a":1}'));
    expect(data).toEqual({ a: 1 });
  });

  it('rejects non-JSON content-type', async () => {
    await expect(
      readJsonBody(makeReq('{}', { 'content-type': 'text/plain' })),
    ).rejects.toMatchObject({ status: 400, code: 'bad_request' });
  });

  it('rejects oversized Content-Length', async () => {
    const body = '{"x":1}';
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '999999',
      },
      body,
    });
    await expect(readJsonBody(req, { maxBytes: 100 })).rejects.toMatchObject({
      status: 413,
      code: 'payload_too_large',
    });
  });

  it('rejects invalid JSON', async () => {
    await expect(readJsonBody(makeReq('{nope'))).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe('readJsonBodyOptional', () => {
  it('returns null for empty body', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-length': '0' },
      body: '',
    });
    expect(await readJsonBodyOptional(req)).toBeNull();
  });
});

describe('sanitizeStoredText', () => {
  it('strips null bytes and control chars, keeps newlines', () => {
    expect(sanitizeStoredText('a\u0000b\nc\td')).toBe('ab\nc\td');
  });

  it('NFC-normalizes and trims', () => {
    expect(sanitizeStoredText('  café  ')).toBe('café');
  });
});
