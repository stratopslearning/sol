import { describe, expect, it, vi } from 'vitest';

import {
  assertPublicHttpsUrl,
  buildToolRegistration,
  DynamicRegistrationError,
  fetchOpenIdConfig,
  registerToolWithPlatform,
} from '@/lib/lti/dynamicRegistration';

const urls = {
  baseUrl: 'https://sol.example.edu/',
  loginUrl: 'https://sol.example.edu/api/lti/login',
  launchUrl: 'https://sol.example.edu/api/lti/launch',
  jwksUrl: 'https://sol.example.edu/api/lti/jwks',
};

const cfg = {
  issuer: 'https://canvas.example.edu',
  authorization_endpoint: 'https://canvas.example.edu/auth',
  token_endpoint: 'https://canvas.example.edu/token',
  jwks_uri: 'https://canvas.example.edu/jwks',
  registration_endpoint: 'https://canvas.example.edu/register',
};

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

describe('assertPublicHttpsUrl', () => {
  it.each([
    'http://canvas.example.edu/x',
    'https://localhost/x',
    'https://127.0.0.1/x',
    'https://10.0.0.5/x',
    'https://192.168.1.1/x',
    'https://169.254.169.254/latest',
    'https://foo.internal/x',
  ])('rejects %s', (u) => {
    expect(() => assertPublicHttpsUrl(u)).toThrow();
  });
  it('accepts public https', () => {
    expect(assertPublicHttpsUrl('https://canvas.example.edu/x').host).toBe('canvas.example.edu');
  });
});

describe('buildToolRegistration', () => {
  it('includes LTI tool configuration and AGS/NRPS scopes', () => {
    const r = buildToolRegistration(urls, 'SOL') as Record<string, any>;
    expect(r.initiate_login_uri).toBe(urls.loginUrl);
    expect(r.redirect_uris).toEqual([urls.launchUrl]);
    expect(r.scope).toContain('lti-ags');
    expect(r.scope).toContain('lti-nrps');
    expect(r['https://purl.imsglobal.org/spec/lti-tool-configuration'].domain).toBe('sol.example.edu');
  });
});

describe('fetchOpenIdConfig', () => {
  it('accepts a complete config whose issuer host matches', async () => {
    const f = vi.fn(async () => json(cfg));
    const out = await fetchOpenIdConfig('https://canvas.example.edu/.well-known/openid-configuration', f as never);
    expect(out.registration_endpoint).toBe(cfg.registration_endpoint);
  });
  it('rejects issuer/host mismatch', async () => {
    const f = vi.fn(async () => json({ ...cfg, issuer: 'https://evil.example.com' }));
    await expect(
      fetchOpenIdConfig('https://canvas.example.edu/.well-known/openid-configuration', f as never),
    ).rejects.toBeInstanceOf(DynamicRegistrationError);
  });
  it('rejects incomplete config', async () => {
    const f = vi.fn(async () => json({ issuer: cfg.issuer }));
    await expect(
      fetchOpenIdConfig('https://canvas.example.edu/c', f as never),
    ).rejects.toBeInstanceOf(DynamicRegistrationError);
  });
});

describe('registerToolWithPlatform', () => {
  it('posts with bearer token and returns client_id (numeric coerced)', async () => {
    const f = vi.fn(async () => json({ client_id: 10000000000001 }));
    const r = await registerToolWithPlatform({
      config: cfg, registrationToken: 'tok', urls, clientName: 'SOL', fetchImpl: f as never,
    });
    expect(r.clientId).toBe('10000000000001');
    const call = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((call[1].headers as Record<string, string>).authorization).toBe('Bearer tok');
  });
  it('surfaces platform rejection', async () => {
    const f = vi.fn(async () => json({}, false, 401));
    await expect(
      registerToolWithPlatform({ config: cfg, urls, clientName: 'SOL', fetchImpl: f as never }),
    ).rejects.toMatchObject({ status: 502 });
  });
});
