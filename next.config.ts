import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/basePath";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      // Clerk, Stripe.js, Sentry, Next — keep tight but workable for App Router.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com https://browser.sentry-cdn.com https://*.sentry.io",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.stripe.com https://*.sentry.io https://*.upstash.io https://*.neon.tech wss://*.clerk.accounts.dev",
      "frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://*.clerk.com",
      "worker-src 'self' blob:",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "strat-ops",

  project: "sentry-fuchsia-mountain",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
