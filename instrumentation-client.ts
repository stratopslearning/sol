// Sentry initialization for the browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import {
  SENTRY_DENY_URLS,
  SENTRY_IGNORE_ERRORS,
  sentryEventMessage,
  shouldIgnoreSentryMessage,
} from '@/lib/sentryIgnore';

const isProd = process.env.NODE_ENV === 'production';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (!dsn) {
  // No-op when unset (local / misconfigured). Never hardcode a project DSN.
}

Sentry.init({
  dsn: dsn || undefined,

  // Session Replay intentionally off (privacy / lawsuit surface). Errors only.
  integrations: [],
  enabled: Boolean(dsn),

  tracesSampleRate: isProd ? 0.1 : 1,
  enableLogs: !isProd,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // PII: stripped in production so cookies / headers / IPs do not flow into Sentry.
  sendDefaultPii: !isProd,

  ignoreErrors: SENTRY_IGNORE_ERRORS,
  denyUrls: SENTRY_DENY_URLS,
  beforeSend(event) {
    if (shouldIgnoreSentryMessage(sentryEventMessage(event))) return null;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
