/**
 * Must match `basePath` in next.config.ts. Used for middleware redirects,
 * plain <a href>, form actions, and fetch() URLs (Link/router handle basePath automatically).
 */
export const BASE_PATH = "/learning" as const;

export function withBasePath(path: string): string {
  const normalized =
    path === "" || path === "/"
      ? "/"
      : path.startsWith("/")
        ? path
        : `/${path}`;
  if (normalized.startsWith(BASE_PATH)) {
    return normalized;
  }
  return `${BASE_PATH}${normalized}`;
}

/** Same as withBasePath; use for /api/... fetches and server-side absolute paths. */
export function apiUrl(path: string): string {
  return withBasePath(path);
}
