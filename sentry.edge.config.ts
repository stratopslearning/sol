// Sentry initialization for edge runtime (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://6c7da7e597d25db5237c68870747ceb7@o4510841491816448.ingest.us.sentry.io/4510841493127168',

  tracesSampleRate: isProd ? 0.1 : 1,
  enableLogs: !isProd,
  sendDefaultPii: !isProd,
});
