// Sentry initialization for the browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://6c7da7e597d25db5237c68870747ceb7@o4510841491816448.ingest.us.sentry.io/4510841493127168',

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: isProd ? 0.1 : 1,
  enableLogs: !isProd,

  // Replay sampling: 10% of sessions in production, 100% on errors so we can
  // reproduce real bug reports. Lower replaysSessionSampleRate further if the
  // bill becomes a concern.
  replaysSessionSampleRate: isProd ? 0.05 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // PII: stripped in production so cookies / headers / IPs do not flow into
  // Sentry. Replay still captures the page DOM — see Sentry docs for masking.
  sendDefaultPii: !isProd,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
