/**
 * Must match `basePath` in next.config.ts.
 *
 * - `withBasePath` / `apiUrl` — plain `<a href>`, fetch(), breadcrumbs, redirects
 * - `appPath` — next/link and router.push (Next.js adds basePath automatically)
 */
export const BASE_PATH = "/learning" as const;

function normalizePath(path: string): string {
  if (path === "" || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Strip basePath for Link/router hrefs (safe if already stripped). */
export function appPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized.startsWith(BASE_PATH)) {
    return normalized.slice(BASE_PATH.length) || "/";
  }
  return normalized;
}

export function withBasePath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized.startsWith(BASE_PATH)) {
    return normalized;
  }
  return `${BASE_PATH}${normalized}`;
}

/** Same as withBasePath; use for /api/... fetches and server-side absolute paths. */
export function apiUrl(path: string): string {
  return withBasePath(path);
}
