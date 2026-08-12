import { redirect, permanentRedirect, type RedirectType } from "next/navigation";

import { appPath } from "@/lib/basePath";

/**
 * Server-side redirects for app-internal paths.
 *
 * Next.js 15.3+ applies `basePath` to `redirect()` / `permanentRedirect()` via
 * `addPathPrefix` during render. Passing an already-prefixed path
 * (`/learning/dashboard`) therefore becomes `/learning/learning/dashboard`.
 *
 * Pass app-relative paths (`/dashboard/...`). Absolute `http(s)://` URLs are
 * left untouched. Accidental basePath prefixes are stripped first.
 *
 * @see https://github.com/vercel/next.js/issues/54546 (historical — fixed by
 * framework prefixing; this helper must NOT also prefix)
 */
export function appRedirect(path: string, type?: RedirectType): never {
  redirect(resolveTarget(path), type);
}

export function appPermanentRedirect(path: string, type?: RedirectType): never {
  permanentRedirect(resolveTarget(path), type);
}

function resolveTarget(path: string): string {
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//")
  ) {
    return path;
  }
  return appPath(path);
}
