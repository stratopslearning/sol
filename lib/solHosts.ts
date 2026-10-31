import { withBasePath } from '@/lib/basePath';

/**
 * Cross-host URLs for the Sol (teachwithsol.com) multi-subdomain deploy.
 * When hosts are unset (StratOps / local `/learning`), links stay same-origin.
 */

export type SolHostRole = 'marketing' | 'app' | 'docs' | 'trust';

const HOST_ENV: Record<SolHostRole, string | undefined> = {
  marketing: process.env.NEXT_PUBLIC_SOL_MARKETING_HOST,
  app: process.env.NEXT_PUBLIC_SOL_APP_HOST,
  docs: process.env.NEXT_PUBLIC_SOL_DOCS_HOST,
  trust: process.env.NEXT_PUBLIC_SOL_TRUST_HOST,
};

/** True when Sol host map env is configured (empty BASE_PATH deploy). */
export function solHostsConfigured(): boolean {
  return Boolean(
    HOST_ENV.marketing && HOST_ENV.app && HOST_ENV.docs && HOST_ENV.trust,
  );
}

function normalizeHost(host: string): string {
  return host.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
}

export function solHost(role: SolHostRole): string | null {
  const raw = HOST_ENV[role];
  return raw ? normalizeHost(raw) : null;
}

function isTeachwithsolMarketingHost(hostname: string | null): boolean {
  return hostname === 'www.teachwithsol.com' || hostname === 'teachwithsol.com';
}

/**
 * teachwithsol: no public login/signup yet — Book a demo only.
 * StratOps `/learning` leaves Sol hosts unset, so auth UI stays available there.
 * Local multi-host: set NEXT_PUBLIC_SOL_DEMO_ONLY=false to keep /login working
 * (ignored on production teachwithsol.com).
 */
export function solDemoOnly(): boolean {
  const marketing = solHost('marketing');
  const isProdTeachwithsol =
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' &&
    isTeachwithsolMarketingHost(marketing);

  const override = process.env.NEXT_PUBLIC_SOL_DEMO_ONLY?.trim().toLowerCase();
  if (override === 'false' || override === '0') {
    if (isProdTeachwithsol) return true;
    return false;
  }
  if (override === 'true' || override === '1') return true;
  if (isTeachwithsolMarketingHost(marketing)) return true;
  return solHostsConfigured();
}

/** Absolute https origin for a Sol role, or null if not configured. */
export function solOrigin(role: SolHostRole): string | null {
  const host = solHost(role);
  return host ? `https://${host}` : null;
}

/**
 * Path → href. When Sol hosts are set, docs/trust/app paths jump hosts;
 * otherwise same-origin withBasePath.
 */
export function solHref(
  path: string,
  role: SolHostRole = roleForPath(path),
): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const origin = solOrigin(role);
  if (!origin) return withBasePath(normalized);
  // Docs live at docs host root as /docs...; trust paths stay as-is on trust host.
  return `${origin}${normalized === '/' ? '' : normalized}`;
}

export function roleForPath(path: string): SolHostRole {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (
    p === '/docs' ||
    p.startsWith('/docs/') ||
    p === '/docs.md' ||
    p === '/llms.txt'
  ) {
    return 'docs';
  }
  if (
    p === '/security' ||
    p.startsWith('/security/') ||
    p === '/privacy' ||
    p.startsWith('/privacy/') ||
    p === '/terms' ||
    p.startsWith('/terms/') ||
    p === '/dmca' ||
    p.startsWith('/dmca/')
  ) {
    return 'trust';
  }
  // Marketing home + in-page anchors (/#product, /#faq, …)
  if (p === '/' || p.startsWith('/#')) return 'marketing';
  return 'app';
}

/** Paths that may be served on the marketing host without redirecting. */
export function isMarketingPath(path: string): boolean {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/' || p.startsWith('/#')) return true;
  if (p === '/unsubscribe' || p.startsWith('/unsubscribe/')) return true;
  if (p === '/api/demo-request') return true;
  if (p === '/robots.txt' || p === '/sitemap.xml') return true;
  if (
    p === '/apple-icon' ||
    p.startsWith('/apple-icon/') ||
    p === '/icon' ||
    p.startsWith('/icon/') ||
    p === '/opengraph-image' ||
    p.startsWith('/opengraph-image/') ||
    p === '/twitter-image' ||
    p.startsWith('/twitter-image/')
  ) {
    return true;
  }
  return false;
}

export function isDocsPath(path: string): boolean {
  return roleForPath(path) === 'docs';
}

export function isTrustPath(path: string): boolean {
  return roleForPath(path) === 'trust';
}

/** Classify request hostname against Sol env hosts (null = not a Sol mapped host). */
export function classifySolHost(hostname: string): SolHostRole | null {
  if (!solHostsConfigured()) return null;
  const h = normalizeHost(hostname.split(':')[0] ?? hostname);
  const marketing = solHost('marketing');
  const app = solHost('app');
  const docs = solHost('docs');
  const trust = solHost('trust');
  // Apex (teachwithsol.com) counts as marketing when www is marketing host.
  if (marketing && (h === marketing || isApexOf(h, marketing))) return 'marketing';
  if (app && h === app) return 'app';
  if (docs && h === docs) return 'docs';
  if (trust && h === trust) return 'trust';
  return null;
}

function isApexOf(hostname: string, wwwHost: string): boolean {
  if (!wwwHost.startsWith('www.')) return false;
  return hostname === wwwHost.slice(4);
}
