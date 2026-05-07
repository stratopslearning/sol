import { redirect, permanentRedirect, type RedirectType } from "next/navigation";

import { withBasePath } from "@/lib/basePath";

/**
 * `next/navigation` `redirect()` does NOT prepend the configured `basePath`
 * (https://github.com/vercel/next.js/issues/54546). Use `appRedirect` for any
 * app-internal redirect from server components, route handlers, server actions,
 * or auth helpers so the response Location stays under `/learning`.
 *
 * Pass external URLs (`http://...`, `https://...`) through untouched.
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
  return withBasePath(path);
}
