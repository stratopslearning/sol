# Production Deployment Checklist

This checklist covers the steps that must be completed in external services
(Vercel, Stripe, Clerk, Neon) before flipping production traffic on. Code is
already production-grade — the items here cannot be solved by a PR.

Run through them top-to-bottom; each section depends on the previous one.

---

## 1. Vercel environment variables

Set these in the Vercel project settings, scoped to the `Production`
environment. (If you also use Preview deploys for QA, mirror them there with
the corresponding test credentials.)

| Variable                          | Required? | Notes                                                              |
| --------------------------------- | --------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                    | yes       | Neon production pooled connection string.                          |
| `CLERK_SECRET_KEY`                | yes       | From the Clerk **Production** instance.                            |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`| yes      | Production publishable key.                                        |
| `NEXT_PUBLIC_PAYMENTS_ENABLED`    | optional  | `true` to enforce the Stripe paywall, `false` (default) to let any signed-in student straight into the dashboard. Defaults to `false` until you flip the paywall on. |
| `STRIPE_SECRET_KEY`               | when paywall on | Live mode key (`sk_live_...`). Optional while `NEXT_PUBLIC_PAYMENTS_ENABLED` is `false`. |
| `STRIPE_WEBHOOK_SECRET`           | when paywall on | Required only when paywall is enabled.                       |
| `STRIPE_PRICE_ID`                 | when paywall on | The price you actually charge in production.                |
| `STRIPE_PRODUCT_ID`               | optional  | Only needed if you want fallback when `STRIPE_PRICE_ID` is unset.  |
| `OPENAI_API_KEY`                  | yes\*     | Required for AI grading. App falls back to deterministic grading without it but pass/fail accuracy degrades. |
| `NEXT_PUBLIC_BASE_URL`            | yes       | Absolute https URL, no trailing slash. Used for Stripe redirects and canonical links. |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | optional | Match the Sentry project's prod DSN.                          |
| `UPSTASH_REDIS_REST_URL`          | optional  | Upgrades rate-limiting from in-memory to distributed.              |
| `UPSTASH_REDIS_REST_TOKEN`        | optional  | Required if `UPSTASH_REDIS_REST_URL` is set.                       |

> **Paywall default:** `NEXT_PUBLIC_PAYMENTS_ENABLED` defaults to `false`, so
> the Stripe gate is OFF out of the box — students sign in and go straight to
> their dashboard. Stripe routes, webhooks, and schema columns stay wired so
> flipping the flag to `true` later requires only an env change + redeploy.

After saving, redeploy. The new `instrumentation.ts` validates these at
boot — if anything required is missing, the deploy will refuse to serve
traffic instead of failing per-request later.

---

## 2. Switch Clerk to a production instance

1. In the Clerk dashboard, create or select your **Production** instance.
2. Update the application's allowed redirect URLs to the production domain
   (`https://your-domain.com/...`). Do not include `localhost`.
3. Copy the **production** publishable + secret keys into Vercel (step 1).
4. Verify a magic-link / sign-up flow against the production deploy with a
   test account. The first sign-in should call `getOrCreateUser` and
   create a row in `users` (you can confirm via Neon's SQL editor).

---

## 3. Register the Stripe webhook

1. In the Stripe **Live** dashboard, go to *Developers → Webhooks → Add
   endpoint*.
2. Endpoint URL: `https://<your-domain>/api/stripe/webhook`.
3. Subscribe to (at minimum) these events:
   - `checkout.session.completed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `charge.dispute.funds_withdrawn`
   - `payment_intent.payment_failed`
4. Copy the **Signing secret** Stripe shows after creating the endpoint
   into Vercel as `STRIPE_WEBHOOK_SECRET`.
5. Confirm `STRIPE_PRICE_ID` matches the price object you actually charge.
   Mismatched price ids are silent — checkout still succeeds but with the
   wrong amount.
6. Send a test event from the Stripe dashboard. In Neon you should see one
   new row in `stripe_events`. Re-sending the same event should NOT create
   a second row (idempotency).

---

## 4. Database migration (Neon prod)

Run from a developer machine pointed at the production `DATABASE_URL`
(set it in `.env.local` for the duration):

```sh
# 1. Take a Neon backup branch first.
# 2. Sanity check that there are no duplicate-row violations:
npm run db:preflight

# 3. If the imported / backed-up DB has missing migration history rows,
#    seed them so drizzle-kit doesn't try to re-apply old migrations:
npm run db:reconcile-history

# 4. Apply pending migrations (currently 0004_phase6_destructive):
npm run migrate
#    Or, if drizzle-kit silently fails on macOS:
npx tsx scripts/apply-migration.ts drizzle/0004_phase6_destructive.sql

# 5. Backfill stripe_customer_id for users who paid before we started
#    storing it:
npm run db:backfill-stripe-customer
```

Verification queries (run in Neon SQL editor):

```sql
-- Every timestamp should be timestamptz now.
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_schema = 'public' AND data_type LIKE 'timestamp%';

-- Soft-delete columns + indexes exist.
SELECT table_name, column_name FROM information_schema.columns
 WHERE column_name IN ('deleted_at','passing_score');
```

---

## 5. Smoke test

Against the production URL:

1. **Sign up** a fresh test account → expect to land on `/payment`.
2. **Pay** with Stripe in live mode (use a real card or a `4242` test card
   in test mode if you're staging). Webhook flips `users.paid = true`.
3. **Enrol** in a section using a known student code → expect 200.
4. **Hammer** `/api/quiz/<id>/submit` 30+ times in a minute → expect a 429
   response with `Retry-After` and `RateLimit-*` headers.
5. **Verify Sentry**: in the Sentry project, use **Issues → Create alert** or
   send a test event from **Settings → Client Keys (DSN) → Send test event**.
   After deploy, confirm new production errors appear (not only local dev).

---

## 6. After-deploy monitoring

For the first 24-48 hours watch:
- Sentry's **Issues** feed for new error signatures.
- Stripe's **Webhooks → Attempts** tab for non-200 responses.
- Vercel function **Logs** for `getaddrinfo`, `ECONNRESET`, or
  `Database connection failed` patterns (Neon hibernation).
- Neon's **Metrics → Connections** to confirm we're staying under the
  pool's connection ceiling.

If anything is wrong, the rate limiter and idempotency table mean the
system can be redeployed without losing partial state.
