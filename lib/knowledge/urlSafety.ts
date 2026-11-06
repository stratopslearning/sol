import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Block SSRF targets for professor-supplied material URLs.
 * Rejects non-http(s), credentials-in-URL, non-default ports outside 80/443,
 * localhost, link-local, private, and cloud metadata ranges.
 */
export function assertSafeMaterialUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URLs with credentials are not allowed');
  }
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error('Only ports 80 and 443 are allowed');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('URL host is not allowed');
  }

  if (isIP(host) && isBlockedIp(host)) {
    throw new Error('URL host is not allowed');
  }

  return parsed;
}

export function isBlockedIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::1' || v === '0:0:0:0:0:0:0:1') return true;
  if (v.startsWith('fe80:') || v.startsWith('fc') || v.startsWith('fd')) {
    return true;
  }

  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

/** Resolve hostname and reject if any address is private/metadata. */
export async function assertSafeMaterialUrlResolved(raw: string): Promise<URL> {
  const parsed = assertSafeMaterialUrl(raw);
  if (isIP(parsed.hostname)) {
    return parsed;
  }
  let records: Array<{ address: string }>;
  try {
    records = await lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('Could not resolve URL host');
  }
  if (!records.length) {
    throw new Error('Could not resolve URL host');
  }
  for (const r of records) {
    if (isBlockedIp(r.address)) {
      throw new Error('URL host resolves to a private address');
    }
  }
  return parsed;
}
