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

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),

  // Stripe. Keys are required only when the paywall is enabled (see invariants
  // below). When disabled, the Stripe routes stay mounted but never run, so
  // missing secrets are not a startup failure.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRODUCT_ID: z.string().min(1).optional(),
  STRIPE_PRICE_ID: z.string().min(1).optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url()
    .optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Rate limiting (Upstash). Optional — when unset we fall back to in-memory
  // limiting, which is fine for single-instance dev but should not be relied
  // on in horizontally scaled prod.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Feature flags. Public so the same flag value applies on the server and in
  // the client bundle (Next inlines NEXT_PUBLIC_* at build time). Default is
  // OFF — Stripe code paths stay wired but every gate behaves as if the user
  // already paid.
  NEXT_PUBLIC_PAYMENTS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
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
  if (data.NODE_ENV === 'production') {
    if (!data.NEXT_PUBLIC_BASE_URL) {
      throw new Error(
        'NEXT_PUBLIC_BASE_URL is required in production (used for canonical URLs).',
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

  return data;
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
