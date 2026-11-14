import { describe, expect, it } from 'vitest';

import {
  assertSafeMaterialUrl,
  isBlockedIp,
} from '@/lib/knowledge/urlSafety';

describe('assertSafeMaterialUrl', () => {
  it('allows normal https URLs', () => {
    const u = assertSafeMaterialUrl('https://example.com/notes.pdf');
    expect(u.hostname).toBe('example.com');
  });

  it('rejects non-http schemes and credentials', () => {
    expect(() => assertSafeMaterialUrl('file:///etc/passwd')).toThrow();
    expect(() =>
      assertSafeMaterialUrl('https://user:pass@example.com/x'),
    ).toThrow(/credentials/i);
  });

  it('rejects localhost and metadata hosts', () => {
    expect(() => assertSafeMaterialUrl('http://localhost/a')).toThrow();
    expect(() =>
      assertSafeMaterialUrl('http://169.254.169.254/latest/meta-data'),
    ).toThrow();
    expect(() =>
      assertSafeMaterialUrl('http://metadata.google.internal/'),
    ).toThrow();
  });

  it('rejects odd ports', () => {
    expect(() => assertSafeMaterialUrl('https://example.com:8443/x')).toThrow(
      /port/i,
    );
  });
});

describe('isBlockedIp', () => {
  it('flags private and loopback ranges', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('10.0.0.5')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
  });
});
