/**
 * Shared Sentry drop rules for browser/server/edge inits.
 * Keep this file runtime-agnostic (no Node or DOM APIs).
 */

export const SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
  'MaxAttemptsExceededError',
  'SentryExampleAPIError',

  // Clerk: session expired / signed-out chrome, not an application crash.
  'You are signed out',
  'An unexpected response was received from the server.',

  // Clerk FAPI when clerk-js has not initialized (Safari minifies to e.execute).
  /is not an object \(evaluating ['"]e\.execute['"]\)/,

  // JSON-LD / translators / extensions walking schema.org script tags.
  /\["@context"\]\.toLowerCase/,
  /@context.*toLowerCase/,

  // Sentry Replay / Clerk workers blocked by privacy tools after a blob URL.
  /Failed to execute 'importScripts'/,
  /importScripts.*WorkerGlobalScope/,

  // Benign: observer callback loop (Chrome).
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications.',

  // Clerk widgets + next-themes: third-party markup differs on first paint.
  'Hydration failed',
  'There was an error while hydrating',
  'Hydration failed because the server rendered HTML didn\'t match the client.',
  'Minified React error #418',
  'Minified React error #423',
  'Minified React error #425',
];

export const SENTRY_DENY_URLS: Array<RegExp> = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-web-extension:\/\//i,
  /extensions\//i,
  /webkit-masked-url/i,
];

export function sentryEventMessage(event: {
  message?: string;
  exception?: { values?: Array<{ value?: string; type?: string }> };
}): string {
  const fromException = event.exception?.values
    ?.map((v) => [v.type, v.value].filter(Boolean).join(': '))
    .filter(Boolean)
    .join('\n');
  return fromException || event.message || '';
}

export function shouldIgnoreSentryMessage(message: string): boolean {
  if (!message) return false;
  return SENTRY_IGNORE_ERRORS.some((rule) =>
    typeof rule === 'string' ? message.includes(rule) : rule.test(message),
  );
}
