// Sentry initialization for the Node.js server runtime.
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

  // Sample 10% of traces in production. 100% sampling at scale would generate
  // a huge volume of spans (and bill). Use Sentry's tracesSampler if specific
  // routes need higher visibility.
  tracesSampleRate: isProd ? 0.1 : 1,

  // Send logs only in non-production. Production code should rely on Sentry
  // breadcrumbs / structured logs instead of arbitrary console output.
  enableLogs: !isProd,

  // Do NOT attach IP / cookies / user-agent to events in production. Those
  // can contain PII that we don't want in our incident reports.
  sendDefaultPii: !isProd,

  ignoreErrors: SENTRY_IGNORE_ERRORS,
  denyUrls: SENTRY_DENY_URLS,
  beforeSend(event) {
    if (shouldIgnoreSentryMessage(sentryEventMessage(event))) return null;
    return event;
  },
});
