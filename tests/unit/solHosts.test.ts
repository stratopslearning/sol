import { afterEach, describe, expect, it, vi } from 'vitest';

describe('lib/solHosts', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('falls back to withBasePath when hosts unset', async () => {
    delete process.env.NEXT_PUBLIC_SOL_MARKETING_HOST;
    delete process.env.NEXT_PUBLIC_SOL_APP_HOST;
    delete process.env.NEXT_PUBLIC_SOL_DOCS_HOST;
    delete process.env.NEXT_PUBLIC_SOL_TRUST_HOST;
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    const { solHref, solHostsConfigured } = await import('@/lib/solHosts');
    expect(solHostsConfigured()).toBe(false);
    expect(solHref('/docs')).toBe('/learning/docs');
    expect(solHref('/login')).toBe('/learning/login');
  });

  it('builds absolute cross-host hrefs when configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    vi.stubEnv('NEXT_PUBLIC_SOL_MARKETING_HOST', 'www.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_APP_HOST', 'app.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_DOCS_HOST', 'docs.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_TRUST_HOST', 'trust.teachwithsol.com');
    const { solHref, classifySolHost, solHostsConfigured } = await import(
      '@/lib/solHosts'
    );
    expect(solHostsConfigured()).toBe(true);
    expect(solHref('/docs')).toBe('https://docs.teachwithsol.com/docs');
    expect(solHref('/security')).toBe('https://trust.teachwithsol.com/security');
    expect(solHref('/login')).toBe('https://app.teachwithsol.com/login');
    expect(solHref('/')).toBe('https://www.teachwithsol.com');
    expect(classifySolHost('teachwithsol.com')).toBe('marketing');
    expect(classifySolHost('www.teachwithsol.com')).toBe('marketing');
    expect(classifySolHost('app.teachwithsol.com')).toBe('app');
  });
});
