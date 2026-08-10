import { withBasePath } from '@/lib/basePath';

/** Origin without basePath, no trailing slash (e.g. https://www.strat-ops.net). */
export function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

/** Absolute URL including the app basePath (e.g. https://…/learning/docs). */
export function absoluteUrl(path: string = '/'): string {
  return `${siteOrigin()}${withBasePath(path)}`;
}
