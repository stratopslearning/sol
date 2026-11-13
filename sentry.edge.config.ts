// Sentry initialization for edge runtime (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import {
  SENTRY_DENY_URLS,
  SENTRY_IGNORE_ERRORS,
  sentryEventMessage,
  shouldIgnoreSentryMessage,
} from '@/lib/sentryIgnore';

const isProd = process.env.NODE_ENV === 'production';

const dsn =
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),

  tracesSampleRate: isProd ? 0.1 : 1,
  enableLogs: !isProd,
  sendDefaultPii: !isProd,
  ignoreErrors: SENTRY_IGNORE_ERRORS,
  denyUrls: SENTRY_DENY_URLS,
  beforeSend(event) {
    if (shouldIgnoreSentryMessage(sentryEventMessage(event))) return null;
    return event;
  },
});
