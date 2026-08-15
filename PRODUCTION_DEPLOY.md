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
| `DATABASE_URL`                    | yes       | Neon **pooled** connection string for the `sol_app` role (DML only). See §4b. |
| `DATABASE_MIGRATE_URL`            | recommended | Neon connection for `sol_migrator` (DDL). Used by drizzle-kit / migrate scripts. Falls back to `DATABASE_URL` locally. |
| `CLERK_SECRET_KEY`                | yes       | From the Clerk **Production** instance.                            |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`| yes      | Production publishable key.                                        |
| `CLERK_WEBHOOK_SIGNING_SECRET`    | **yes (prod)** | Svix signing secret for `/api/clerk/webhook` (auth session audit). Alias: `CLERK_WEBHOOK_SECRET`. |
| `NEXT_PUBLIC_PAYMENTS_ENABLED`    | optional  | `true` to enforce the Stripe paywall, `false` (default) to let any signed-in student straight into the dashboard. Defaults to `false` until you flip the paywall on. |
| `STRIPE_SECRET_KEY`               | when paywall on | Live mode key (`sk_live_...`). Optional while `NEXT_PUBLIC_PAYMENTS_ENABLED` is `false`. |
| `STRIPE_WEBHOOK_SECRET`           | when paywall on | Required only when paywall is enabled.                       |
| `STRIPE_PRICE_ID`                 | when paywall on | The price you actually charge in production.                |
| `STRIPE_PRODUCT_ID`               | optional  | Only needed if you want fallback when `STRIPE_PRICE_ID` is unset.  |
| `OPENAI_API_KEY`                  | yes       | Required in production — app refuses to boot without it (short-answer grading). |
| `CRON_SECRET`                     | **yes (prod)** | Bearer for `/api/cron/grade-pending`. Vercel Cron sends `Authorization: Bearer`. |
| `NEXT_PUBLIC_BASE_URL`            | yes       | Absolute https URL, no trailing slash. Used for Stripe redirects and canonical links. |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | optional | Match the Sentry project's prod DSN.                          |
| `UPSTASH_REDIS_REST_URL`          | **yes (prod)** | Required in production — app refuses to boot without it. Distributed rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN`        | **yes (prod)** | Required with the URL above.                       |

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
5. Register the Clerk auth webhook:
   - Endpoint: `https://<your-domain>/learning/api/clerk/webhook`
   - Events: `session.created`, `session.ended`, `session.revoked`, `session.removed`
   - Paste the Signing secret into Vercel as `CLERK_WEBHOOK_SIGNING_SECRET`
   - Confirm a sign-in writes `auth.session.create` to `audit_log` and a row
     into `clerk_events`

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

Prefer `DATABASE_MIGRATE_URL` (the `sol_migrator` role) for all migrate
commands. Runtime traffic must keep using the `sol_app` `DATABASE_URL`.

Run from a developer machine pointed at the production migrator URL
(set it in `.env.local` for the duration):

```sh
# 1. Take a Neon backup branch first.
# 2. Sanity check that there are no duplicate-row violations:
npm run db:preflight

# 3. If the imported / backed-up DB has missing migration history rows,
#    seed them so drizzle-kit doesn't try to re-apply old migrations:
npm run db:reconcile-history

# 4. Apply pending migrations. Prefer apply-migration.ts until Drizzle
#    journal history is fully reconciled (missing 0000 makes `npm run migrate`
#    unreliable). Newest additive migration:
npx tsx scripts/apply-migration.ts drizzle/0012_clerk_events.sql
#    Earlier examples:
# npx tsx scripts/apply-migration.ts drizzle/0007_attempts_one_open.sql
# npx tsx scripts/apply-migration.ts drizzle/0006_chatbots.sql
#    Do not regenerate historical 0003–0006 kit snapshots casually.

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

-- Clerk webhook idempotency table exists.
SELECT to_regclass('public.clerk_events');
```

---

## 4b. Neon least-privilege roles (recommended before broad rollout)

Today a single owner-class URL works, but production should split credentials:

| Role | Privileges | Env var |
| --- | --- | --- |
| `sol_app` | `SELECT/INSERT/UPDATE/DELETE` + sequence `USAGE`. **No** DDL. | `DATABASE_URL` (pooled) |
| `sol_migrator` | DDL for drizzle migrations | `DATABASE_MIGRATE_URL` |

1. Open Neon SQL Editor as the project owner.
2. Edit passwords in [`scripts/sql/create-app-role.sql`](scripts/sql/create-app-role.sql) and run the script.
3. Create connection strings for both roles (prefer `-pooler` for `sol_app`).
4. Set Vercel Production `DATABASE_URL` → `sol_app`, `DATABASE_MIGRATE_URL` → `sol_migrator`.
5. Smoke-test: login, quiz submit, then `npx tsx scripts/apply-migration.ts drizzle/0012_clerk_events.sql` with the migrator URL (should no-op if already applied).
6. Confirm `SET ROLE sol_app; CREATE TABLE _x(id int);` fails.

Do **not** apply the role SQL from CI or the Next.js runtime.

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

---

## 7. Security & compliance (production hardening)

1. **Preview protection** — In Vercel → Project → Settings → Deployment Protection,
   require authentication for Preview deployments so education-record staging
   data is not world-readable.
2. **Separate secrets** — Production Clerk / Neon / Stripe / OpenAI keys must
   never be copied into Preview. Use Preview-specific Clerk + Neon branch.
3. **Console SSO / MFA** — Enable SSO or MFA on Vercel, Neon, Clerk, OpenAI,
   Stripe, Sentry, Upstash, and GitHub org accounts.
4. **Clerk end-user session / MFA / lockout** — Configure Production instance
   per [`compliance/CLERK_AUTH_CONTROLS.md`](./compliance/CLERK_AUTH_CONTROLS.md)
   and keep screenshots for HECVAT.
5. **Vercel Firewall / WAF** — Enable on Production per
   [`compliance/WAF_VERCEL.md`](./compliance/WAF_VERCEL.md).
6. **OpenAI ZDR** — Complete [`compliance/evidence/OPENAI_ZDR_CHECKLIST.md`](./compliance/evidence/OPENAI_ZDR_CHECKLIST.md).
7. **Headers** — Confirm production responses include `Strict-Transport-Security`
   and `Content-Security-Policy` (set in `next.config.ts`).
8. **Self-audit** — Follow [`compliance/SELF_AUDIT.md`](./compliance/SELF_AUDIT.md)
   (access reviews, restore drill, IR tabletop). Full binder: [`compliance/`](./compliance/).
   University packet: [`compliance/HECVAT_LITE_ANSWERS.md`](./compliance/HECVAT_LITE_ANSWERS.md).
9. **Campus SSO (FGCU)** — When ready, follow
   [`compliance/SSO_FGCU_PLAN.md`](./compliance/SSO_FGCU_PLAN.md).
