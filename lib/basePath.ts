/**
 * Must match `basePath` in next.config.ts.
 *
 * - Default `/learning` when `NEXT_PUBLIC_BASE_PATH` is unset (StratOps + local).
 * - Sol deploy sets `NEXT_PUBLIC_BASE_PATH=` (empty) for root URLs (no `/learning`).
 * - Use `??` semantics: empty string is intentional; do not fall back with `||`.
 *
 * - `withBasePath` / `apiUrl`: plain `<a href>`, fetch(), breadcrumbs, redirects
 * - `appPath`: next/link and router.push (Next.js adds basePath automatically)
 */

function resolveBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH;
  if (raw === undefined) return '/learning';
  if (raw === '' || raw === '/') return '';
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export const BASE_PATH = resolveBasePath();

function normalizePath(path: string): string {
  if (path === '' || path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

/** Strip basePath for Link/router hrefs (safe if already stripped). */
export function appPath(path: string): string {
  const normalized = normalizePath(path);
  if (!BASE_PATH) return normalized;
  if (normalized === BASE_PATH || normalized.startsWith(`${BASE_PATH}/`)) {
    return normalized.slice(BASE_PATH.length) || '/';
  }
  return normalized;
}

export function withBasePath(path: string): string {
  const normalized = normalizePath(path);
  if (!BASE_PATH) return normalized;
  if (normalized === BASE_PATH || normalized.startsWith(`${BASE_PATH}/`)) {
    return normalized;
  }
  return `${BASE_PATH}${normalized}`;
}

/** Same as withBasePath; use for /api/... fetches and server-side absolute paths. */
export function apiUrl(path: string): string {
  return withBasePath(path);
}
