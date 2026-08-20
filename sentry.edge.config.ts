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

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://6c7da7e597d25db5237c68870747ceb7@o4510841491816448.ingest.us.sentry.io/4510841493127168',

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
