import { afterEach, describe, expect, it, vi } from 'vitest';

describe('lib/basePath', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defaults to /learning when NEXT_PUBLIC_BASE_PATH is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', undefined as unknown as string);
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    const mod = await import('@/lib/basePath');
    expect(mod.BASE_PATH).toBe('/learning');
    expect(mod.withBasePath('/login')).toBe('/learning/login');
    expect(mod.appPath('/learning/dashboard')).toBe('/dashboard');
  });

  it('uses empty basePath when NEXT_PUBLIC_BASE_PATH is empty string', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    const mod = await import('@/lib/basePath');
    expect(mod.BASE_PATH).toBe('');
    expect(mod.withBasePath('/login')).toBe('/login');
    expect(mod.appPath('/dashboard')).toBe('/dashboard');
    expect(mod.apiUrl('/api/user')).toBe('/api/user');
  });
});
