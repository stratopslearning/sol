import { withBasePath } from '@/lib/basePath';

/**
 * Cross-host URLs for the Sol (teachwithsol.com) multi-subdomain deploy.
 * When hosts are unset (StratOps / local `/learning`), links stay same-origin.
 *
 * Local multi-host (no /etc/hosts needed on modern browsers):
 *   NEXT_PUBLIC_SOL_MARKETING_HOST=www.localhost:3000
 *   NEXT_PUBLIC_SOL_APP_HOST=app.localhost:3000
 *   … (docs / trust). Protocol defaults to http for *.localhost.
 */

export type SolHostRole = 'marketing' | 'app' | 'docs' | 'trust';

type ParsedSolHost = {
  /** Hostname only (no port). */
  hostname: string;
  port: string | null;
  protocol: 'http' | 'https';
};

const HOST_ENV: Record<SolHostRole, string | undefined> = {
  marketing: process.env.NEXT_PUBLIC_SOL_MARKETING_HOST,
  app: process.env.NEXT_PUBLIC_SOL_APP_HOST,
  docs: process.env.NEXT_PUBLIC_SOL_DOCS_HOST,
  trust: process.env.NEXT_PUBLIC_SOL_TRUST_HOST,
};

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === '127.0.0.1'
  );
}

function parseSolHostEnv(raw: string | undefined): ParsedSolHost | null {
  if (!raw?.trim()) return null;
  let value = raw.trim();
  let protocol: 'http' | 'https' | null = null;
  if (/^https:\/\//i.test(value)) {
    protocol = 'https';
    value = value.slice('https://'.length);
  } else if (/^http:\/\//i.test(value)) {
    protocol = 'http';
    value = value.slice('http://'.length);
  }
  value = value.replace(/\/$/, '').toLowerCase();

  let hostname = value;
  let port: string | null = null;
  const colon = value.lastIndexOf(':');
  if (colon > 0) {
    const maybePort = value.slice(colon + 1);
    if (/^\d+$/.test(maybePort)) {
      hostname = value.slice(0, colon);
      port = maybePort;
    }
  }

  return {
    hostname,
    port,
    protocol: protocol ?? (isLocalHostname(hostname) ? 'http' : 'https'),
  };
}

function parsedHost(role: SolHostRole): ParsedSolHost | null {
  return parseSolHostEnv(HOST_ENV[role]);
}

/** True when Sol host map env is configured (empty BASE_PATH deploy). */
export function solHostsConfigured(): boolean {
  return Boolean(
    parsedHost('marketing') &&
      parsedHost('app') &&
      parsedHost('docs') &&
      parsedHost('trust'),
  );
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
    // Production teachwithsol stays demo-only even if someone flips the flag.
    if (isProdTeachwithsol) return true;
    return false;
  }
  if (override === 'true' || override === '1') return true;
  if (isTeachwithsolMarketingHost(marketing)) return true;
  return solHostsConfigured();
}

/** Hostname only (no port), for comparisons. */
export function solHost(role: SolHostRole): string | null {
  return parsedHost(role)?.hostname ?? null;
}

function isLocalMarketingHost(hostname: string | null): boolean {
  return (
    hostname === 'localhost' ||
    Boolean(hostname?.endsWith('.localhost'))
  );
}

function isTeachwithsolMarketingHost(hostname: string | null): boolean {
  return hostname === 'www.teachwithsol.com' || hostname === 'teachwithsol.com';
}

/**
 * Founders inbox on the local TeachWithSol host map and on production
 * teachwithsol.com. Preview and StratOps stay without it.
 * `NEXT_PUBLIC_VERCEL_ENV` is inlined from `VERCEL_ENV` in next.config.
 */
export function foundersContactEnabled(): boolean {
  const marketing = solHost('marketing');
  if (isLocalMarketingHost(marketing)) return true;
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' &&
    isTeachwithsolMarketingHost(marketing)
  );
}

/**
 * Privacy address stays on StratOps. TeachWithSol, local and Vercel, does not
 * publish it.
 */
export function privacyEmailEnabled(): boolean {
  const marketing = solHost('marketing');
  if (isLocalMarketingHost(marketing)) return false;
  if (isTeachwithsolMarketingHost(marketing)) return false;
  return true;
}

/** Absolute origin for a Sol role, or null if not configured. */
export function solOrigin(role: SolHostRole): string | null {
  const parsed = parsedHost(role);
  if (!parsed) return null;
  const hostWithPort = parsed.port
    ? `${parsed.hostname}:${parsed.port}`
    : parsed.hostname;
  return `${parsed.protocol}://${hostWithPort}`;
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
  // Crawl artifacts prefer the marketing Host (www), not the app host.
  if (p === '/robots.txt' || p === '/sitemap.xml') return 'marketing';
  // Blog lives on the marketing host (www), not docs.
  if (p === '/blog' || p.startsWith('/blog/') || p === '/blog.md') {
    return 'marketing';
  }
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
  if (p === '/blog' || p.startsWith('/blog/') || p === '/blog.md') return true;
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
  const h = (hostname.split(':')[0] ?? hostname).toLowerCase();
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
