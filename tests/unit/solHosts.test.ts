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
    expect(solHref('/sitemap.xml')).toBe(
      'https://www.teachwithsol.com/sitemap.xml',
    );
    expect(solHref('/robots.txt')).toBe(
      'https://www.teachwithsol.com/robots.txt',
    );
    expect(solHref('/blog')).toBe('https://www.teachwithsol.com/blog');
    expect(solHref('/blog/grader-of-record')).toBe(
      'https://www.teachwithsol.com/blog/grader-of-record',
    );
    expect(classifySolHost('teachwithsol.com')).toBe('marketing');
    expect(classifySolHost('www.teachwithsol.com')).toBe('marketing');
    expect(classifySolHost('app.teachwithsol.com')).toBe('app');
  });

  it('keeps production teachwithsol demo-only even when override is false', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    vi.stubEnv('NEXT_PUBLIC_SOL_MARKETING_HOST', 'www.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_APP_HOST', 'app.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_DOCS_HOST', 'docs.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_TRUST_HOST', 'trust.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SOL_DEMO_ONLY', 'false');
    const { solDemoOnly } = await import('@/lib/solHosts');
    expect(solDemoOnly()).toBe(true);
  });

  it('uses http origins for local *.localhost hosts with ports', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    vi.stubEnv('NEXT_PUBLIC_SOL_MARKETING_HOST', 'www.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SOL_APP_HOST', 'app.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SOL_DOCS_HOST', 'docs.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SOL_TRUST_HOST', 'trust.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SOL_DEMO_ONLY', 'false');
    const {
      solHref,
      solOrigin,
      classifySolHost,
      solDemoOnly,
      solHostsConfigured,
    } = await import('@/lib/solHosts');
    expect(solHostsConfigured()).toBe(true);
    expect(solDemoOnly()).toBe(false);
    expect(solOrigin('marketing')).toBe('http://www.localhost:3000');
    expect(solHref('/docs')).toBe('http://docs.localhost:3000/docs');
    expect(solHref('/login')).toBe('http://app.localhost:3000/login');
    expect(classifySolHost('www.localhost:3000')).toBe('marketing');
    expect(classifySolHost('app.localhost')).toBe('app');
  });

  it('publishes the founders contact on local and production teachwithsol.com', async () => {
    vi.stubEnv('NEXT_PUBLIC_SOL_MARKETING_HOST', 'www.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_APP_HOST', 'app.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_DOCS_HOST', 'docs.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_TRUST_HOST', 'trust.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    const production = await import('@/lib/solHosts');
    expect(production.foundersContactEnabled()).toBe(true);
    expect(production.privacyEmailEnabled()).toBe(false);

    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SOL_MARKETING_HOST', 'www.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SOL_APP_HOST', 'app.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SOL_DOCS_HOST', 'docs.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SOL_TRUST_HOST', 'trust.localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'development');
    const local = await import('@/lib/solHosts');
    expect(local.foundersContactEnabled()).toBe(true);
    expect(local.privacyEmailEnabled()).toBe(false);
  });

  it('hides the founders contact on preview and StratOps, and keeps privacy off Vercel teachwithsol', async () => {
    vi.stubEnv('NEXT_PUBLIC_SOL_MARKETING_HOST', 'www.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_APP_HOST', 'app.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_DOCS_HOST', 'docs.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_SOL_TRUST_HOST', 'trust.teachwithsol.com');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
    const preview = await import('@/lib/solHosts');
    expect(preview.foundersContactEnabled()).toBe(false);
    expect(preview.privacyEmailEnabled()).toBe(false);

    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SOL_MARKETING_HOST', '');
    vi.stubEnv('NEXT_PUBLIC_SOL_APP_HOST', '');
    vi.stubEnv('NEXT_PUBLIC_SOL_DOCS_HOST', '');
    vi.stubEnv('NEXT_PUBLIC_SOL_TRUST_HOST', '');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    const stratops = await import('@/lib/solHosts');
    expect(stratops.foundersContactEnabled()).toBe(false);
    expect(stratops.privacyEmailEnabled()).toBe(true);
  });
});
