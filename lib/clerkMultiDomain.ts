import { solHostsConfigured, solOrigin, type SolHostRole } from '@/lib/solHosts';

/**
 * Clerk multi-domain (primary strat-ops + satellite teachwithsol).
 *
 * Satellite env (teachwithsol Vercel project):
 *   NEXT_PUBLIC_CLERK_IS_SATELLITE=true
 *   NEXT_PUBLIC_CLERK_DOMAIN=app.teachwithsol.com
 *   NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://www.strat-ops.net/learning/login
 *   NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://www.strat-ops.net/learning/signup
 *
 * Primary env (StratOps): keep relative sign-in URLs; set
 *   NEXT_PUBLIC_CLERK_ALLOWED_REDIRECT_ORIGINS=
 *     https://app.teachwithsol.com,https://www.teachwithsol.com,https://teachwithsol.com
 */

export function isClerkSatellite(): boolean {
  return (
    process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === 'true' ||
    process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === '1'
  );
}

/** Origins the primary instance may redirect back to after satellite sign-in. */
export function clerkAllowedRedirectOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_CLERK_ALLOWED_REDIRECT_ORIGINS;
  if (raw?.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }

  if (solHostsConfigured()) {
    const roles: SolHostRole[] = ['app', 'marketing', 'docs', 'trust'];
    const origins = new Set<string>();
    for (const role of roles) {
      const origin = solOrigin(role);
      if (!origin) continue;
      origins.add(origin);
      try {
        const u = new URL(origin);
        if (u.hostname.startsWith('www.')) {
          u.hostname = u.hostname.slice(4);
          origins.add(u.origin);
        }
      } catch {
        /* ignore bad origin */
      }
    }
    return [...origins];
  }

  return [];
}

/** Props for `<ClerkProvider>` / `clerkMiddleware` options. */
export function clerkSatelliteProviderProps(): {
  isSatellite?: boolean;
  domain?: string;
  signInUrl?: string;
  signUpUrl?: string;
} {
  if (!isClerkSatellite()) return {};
  const domain = process.env.NEXT_PUBLIC_CLERK_DOMAIN?.replace(/\/$/, '');
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL;
  return {
    isSatellite: true,
    ...(domain ? { domain } : {}),
    ...(signInUrl ? { signInUrl } : {}),
    ...(signUpUrl ? { signUpUrl } : {}),
  };
}
