/**
 * Centralized, Zod-validated environment loader.
 *
 * The first time this module is imported it parses `process.env` against the
 * schemas below and throws a descriptive error if anything required is
 * missing or malformed. Importing from here (instead of reaching into
 * `process.env` directly) gives us:
 *   - One place to add a new env var.
 *   - Compile-time types for all consumers.
 *   - Eager validation that fails fast at boot rather than later at runtime.
 */
import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  // Optional migrate-only URL (sol_migrator). Runtime always uses DATABASE_URL
  // (sol_app). Local/dev may leave this unset and reuse DATABASE_URL.
  DATABASE_MIGRATE_URL: z.string().url().optional(),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),

  // Clerk webhooks (Svix). Prefer CLERK_WEBHOOK_SIGNING_SECRET (Clerk SDK
  // default). CLERK_WEBHOOK_SECRET is accepted as an alias in the route.
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Stripe. Keys are required only when the paywall is enabled (see invariants
  // below). When disabled, the Stripe routes stay mounted but never run, so
  // missing secrets are not a startup failure.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRODUCT_ID: z.string().min(1).optional(),
  STRIPE_PRICE_ID: z.string().min(1).optional(),

  // OpenAI: optional in development (SA answers stay pending). Required
  // in production so short-answer exams cannot sit ungraded forever.
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Vercel Cron bearer for grade-pending. Required in production.
  CRON_SECRET: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url()
    .optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Braintrust: optional LLM/agent tracing + evals (no-op when unset).
  BRAINTRUST_API_KEY: z.string().min(1).optional(),
  BRAINTRUST_PROJECT: z.string().min(1).optional().default('SOL'),
  BRAINTRUST_SAMPLE_RATE: z
    .string()
    .regex(/^(0(\.\d+)?|1(\.0+)?)$/)
    .optional(),

  // Rate limiting (Upstash). Optional in development (in-memory fallback).
  // Required in production: see invariants below.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Background jobs: `after` (default) or `inngest` (durable queue).
  // Local: JOBS_BACKEND=inngest + `npm run jobs:dev`. Optional Inngest keys
  // for Cloud; Dev Server works without them.
  JOBS_BACKEND: z.enum(['after', 'inngest']).optional().default('after'),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),

  // Feature flags. Public so the same flag value applies on the server and in
  // the client bundle (Next inlines NEXT_PUBLIC_* at build time). Default is
  // OFF. Stripe code paths stay wired but every gate behaves as if the user
  // already paid.
  NEXT_PUBLIC_PAYMENTS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),

  // Staging/dev k6 impersonation. Must never be set when VERCEL_ENV=production.
  // Do not set on preview either unless Vercel Deployment Protection is on
  // (see compliance/WAF_VERCEL.md): the secret is session-equivalent.
  LOAD_TEST_SECRET: z.string().min(16).optional(),

  // Knowledge module. AWS S3 for course material file bytes. Optional in
  // development so the app still boots without S3; upload routes fail clearly
  // when unset. Credentials use the default AWS SDK chain (env keys, profile,
  // or instance role): do not put long-lived secrets in this schema.
  AWS_REGION: z.string().min(1).optional(),
  AWS_S3_BUCKET: z.string().min(1).optional(),
  AWS_PROFILE: z.string().min(1).optional(),

  // Transactional email via AWS SES. Off by default; invite flows still mint
  // claim links for manual share when disabled or send fails.
  EMAIL_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),

  /** Comma-separated emails allowed to grant/revoke users.platform_staff. */
  PLATFORM_STAFF_GRANTORS: z.string().optional(),

  // Canvas LTI 1.3 Advantage. Optional: when unset, LTI routes return 503 and
  // enrollment-code flows work unchanged. Required together when LTI_ENABLED=true.
  LTI_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  LTI_ISSUER: z.string().url().optional(),
  LTI_CLIENT_ID: z.string().min(1).optional(),
  LTI_AUTH_LOGIN_URL: z.string().url().optional(),
  LTI_AUTH_TOKEN_URL: z.string().url().optional(),
  LTI_KEY_SET_URL: z.string().url().optional(),
  LTI_DEPLOYMENT_ID: z.string().min(1).optional(),
  LTI_TOOL_PRIVATE_KEY: z.string().min(1).optional(),
  LTI_TOOL_PUBLIC_KEY: z.string().min(1).optional(),
  LTI_TOOL_KEY_ID: z.string().min(1).optional(),
  LTI_PLATFORM_LABEL: z.string().min(1).optional(),
});

type RawEnv = z.infer<typeof baseSchema>;

function loadEnv(): RawEnv {
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const data = parsed.data;

  // Higher-level invariants we cannot express purely via Zod:
  if (process.env.VERCEL_ENV === 'production' && data.LOAD_TEST_SECRET) {
    throw new Error(
      'LOAD_TEST_SECRET must not be set when VERCEL_ENV=production.',
    );
  }

  if (data.NODE_ENV === 'production') {
    if (!data.NEXT_PUBLIC_BASE_URL) {
      throw new Error(
        'NEXT_PUBLIC_BASE_URL is required in production (used for canonical URLs).',
      );
    }
    // Distributed rate limiting is required in production: in-memory fallback
    // is not safe across multiple Vercel instances (SOC 2 / abuse control).
    if (!data.UPSTASH_REDIS_REST_URL || !data.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production.',
      );
    }
    if (!data.CRON_SECRET) {
      throw new Error(
        'CRON_SECRET is required in production (Vercel Cron Authorization).',
      );
    }
    if (!data.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY is required in production (short-answer grading).',
      );
    }
    if (!data.CLERK_WEBHOOK_SIGNING_SECRET && !data.CLERK_WEBHOOK_SECRET) {
      throw new Error(
        'CLERK_WEBHOOK_SIGNING_SECRET is required in production (Clerk auth-event webhook).',
      );
    }
    if (data.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true') {
      if (!data.STRIPE_SECRET_KEY) {
        throw new Error(
          'STRIPE_SECRET_KEY is required in production when payments are enabled.',
        );
      }
      if (!data.STRIPE_WEBHOOK_SECRET) {
        throw new Error(
          'STRIPE_WEBHOOK_SECRET is required in production when payments are enabled.',
        );
      }
    }
  }

  if (!data.STRIPE_PRICE_ID && !data.STRIPE_PRODUCT_ID) {
    // Either is acceptable but at least one must be set if we ever expect
    // checkout to function. Skipped entirely when the paywall is disabled
    // because no checkout will ever run.
    if (
      data.NODE_ENV === 'production' &&
      data.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true'
    ) {
      throw new Error(
        'Either STRIPE_PRICE_ID or STRIPE_PRODUCT_ID must be configured in production.',
      );
    }
  }

  if (data.LTI_ENABLED === 'true') {
    const required = [
      'LTI_ISSUER',
      'LTI_CLIENT_ID',
      'LTI_AUTH_LOGIN_URL',
      'LTI_AUTH_TOKEN_URL',
      'LTI_KEY_SET_URL',
      'LTI_DEPLOYMENT_ID',
      'LTI_TOOL_PRIVATE_KEY',
      'LTI_TOOL_PUBLIC_KEY',
      'LTI_TOOL_KEY_ID',
    ] as const;
    const missing = required.filter((key) => !data[key]);
    if (missing.length > 0) {
      throw new Error(
        `LTI_ENABLED=true requires: ${missing.join(', ')}.`,
      );
    }
  }

  if (data.EMAIL_ENABLED === 'true') {
    if (!data.EMAIL_FROM) {
      throw new Error('EMAIL_FROM is required when EMAIL_ENABLED=true.');
    }
    if (!data.AWS_REGION) {
      throw new Error('AWS_REGION is required when EMAIL_ENABLED=true.');
    }
  }

  // Local/dev must only talk to allowlisted Neon hosts (sol-knowledge-dev).
  // Production and Vercel deploys are not gated here — those use hosting env vars.
  if (
    data.NODE_ENV === 'development' &&
    process.env.VERCEL_ENV !== 'production' &&
    process.env.VERCEL_ENV !== 'preview'
  ) {
    assertDevDatabaseHost(data.DATABASE_URL);
    assertDevDatabaseAppRole(data.DATABASE_URL);
  }

  return data;
}

/** Refuse owner/migrator roles for app runtime in local dev (use sol_app). */
function assertDevDatabaseAppRole(databaseUrl: string): void {
  if (process.env.SOL_REQUIRE_APP_ROLE === '0') return;
  let username: string;
  try {
    username = decodeURIComponent(new URL(databaseUrl).username);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  const lower = username.toLowerCase();
  if (
    lower === 'neondb_owner' ||
    lower === 'sol_migrator' ||
    lower.includes('owner')
  ) {
    throw new Error(
      'Refusing to start: DATABASE_URL must use the sol_app role in development, not an owner/migrator user. Set DATABASE_URL to a sol_app connection string, or set SOL_REQUIRE_APP_ROLE=0 to override (not recommended).',
    );
  }
}

function assertDevDatabaseHost(databaseUrl: string): void {
  const allowlist = (process.env.DEV_DB_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) {
    throw new Error(
      'DEV_DB_HOSTS is required in development. Set it to the sol-knowledge-dev Neon host(s) in .env.local.',
    );
  }
  let host: string;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  const allowed = allowlist.some(
    (entry) => host === entry || host.endsWith(`.${entry}`),
  );
  if (!allowed) {
    throw new Error(
      `Refusing to start: DATABASE_URL host "${host}" is not in DEV_DB_HOSTS. Use sol-knowledge-dev only.`,
    );
  }
}

// Lazy singleton so tests can stub `process.env` before first import.
let cached: RawEnv | undefined;
export function env(): RawEnv {
  if (!cached) cached = loadEnv();
  return cached;
}

// Convenience boolean for code paths that want a quick prod check.
export function isProduction(): boolean {
  return env().NODE_ENV === 'production';
}

/** Emails allowed to grant/revoke `users.platform_staff`. Empty = nobody. */
export function platformStaffGrantorEmails(): Set<string> {
  const raw = env().PLATFORM_STAFF_GRANTORS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function canGrantPlatformStaff(email: string | null | undefined): boolean {
  if (!email) return false;
  return platformStaffGrantorEmails().has(email.trim().toLowerCase());
}
