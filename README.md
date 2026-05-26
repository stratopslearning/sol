# SOL

**An academic learning management system for institutions that take pedagogy seriously.**

SOL turns long-form course content into structured, auto-graded coursework. Faculty author once, students learn at scale, and every attempt — including AI-graded short-answer responses — is fully auditable by the institution that owns the data.

[Live](https://www.strat-ops.net/learning) · [Production checklist](./PRODUCTION_DEPLOY.md)

---

## Highlights

- **AI-graded short answers** with rubric-aligned reasoning. Every score includes the model's working so faculty can verify, not just trust.
- **Course / Section / Quiz model** designed for real institutions: enrollment codes, multi-section courses, professor TAs, and admin oversight.
- **Soft-delete + audit log** on every destructive action, with admin-only purge endpoints when records truly need to disappear.
- **Stripe-ready** but launches with payments disabled by default via a feature flag — flip it on without redeploying schema.
- **FERPA-aware defaults**: PII never logged in production, server-side authorization on every page and API route, role-based redirects.
- **Deterministic fallback grading** so the system stays usable when OpenAI is unreachable or the key is rotated.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC, Edge middleware + Node serverless functions) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Auth | Clerk (embedded `<SignIn />` / `<SignUp />`) |
| Database | Neon Postgres + Drizzle ORM (Pool driver for transactions) |
| AI | OpenAI (gpt-class models with structured-output Zod validation) |
| Payments | Stripe Checkout + webhooks (idempotency via dedicated `stripe_events` table) |
| Observability | Sentry (server + edge + browser), structured audit log |
| Rate limiting | Upstash Redis with in-memory fallback |
| Tests | Vitest (unit + integration against a Neon test branch) |
| Hosting | Vercel |

---

## Roles

| Role | Reach |
| --- | --- |
| `STUDENT` | Enrolls into sections via code, takes quizzes, sees own attempts and grades. |
| `PROFESSOR` | Authors quizzes, assigns to sections they teach, views section gradebooks, enrolls into sections via professor codes. |
| `ADMIN` | Manages users, courses, sections, all quizzes; soft-delete and purge; audit log access. |

Cross-role access attempts redirect to the user's own dashboard rather than 404. The full check chain lives in [`lib/auth.ts`](./lib/auth.ts) (`requireAuth`, `requireRole`, `requireAdmin`, `requireProfessor`, `requireStudent`).

---

## Quick start

Requirements: Node 20+, npm 10+, a Neon (or other Postgres) database URL, and Clerk dev keys.

```bash
# 1. Install
npm install

# 2. Configure environment (see "Environment variables" below)
cp .env.example .env.local   # if you don't have one, create it from the table below

# 3. Apply schema migrations
npm run migrate

# 4. Run
npm run dev
```

The app is mounted at **`/learning`** (Next.js `basePath`). Local dev URL:

```
http://localhost:3000/learning
```

> Anything that builds an absolute path must go through `withBasePath()` / `apiUrl()` from [`lib/basePath.ts`](./lib/basePath.ts). Server redirects must use `appRedirect()` from [`lib/serverRedirect.ts`](./lib/serverRedirect.ts) so `/learning` is preserved.

---

## Environment variables

Validated at boot via Zod in [`lib/env.ts`](./lib/env.ts). The full production checklist lives in [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md). Minimum to run locally:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres pooled connection string. |
| `CLERK_SECRET_KEY` | Clerk server key (dev or prod). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/learning/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/learning/signup` |
| `NEXT_PUBLIC_BASE_URL` | Absolute origin (e.g. `https://www.strat-ops.net`), no trailing slash, no basePath. |
| `OPENAI_API_KEY` | Optional in dev; required for production AI grading. Falls back to deterministic scoring when absent. |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | `false` (default) keeps the Stripe paywall off. Set to `true` only after Stripe keys + webhook are wired. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | Required only when payments are enabled. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional. Promotes rate-limiting from in-memory to distributed. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional but recommended in production. |

---

## Project layout

```
app/
  api/                     # Route handlers (Node serverless)
    admin/                 # Admin-only CRUD with audit logging
    professor/             # Professor authoring + section management
    student/               # Student enrollment
    quiz/                  # Quiz attempt lifecycle (start, submit, attempts)
    stripe/                # Checkout + webhook (idempotent)
  dashboard/               # Role-scoped dashboards (admin, professor, student)
  login/  signup/          # Clerk-embedded auth pages
  payment/                 # Stripe paywall (gated by feature flag)
  quiz/[quizId]/           # Student-facing quiz attempt UI
  page.tsx                 # Marketing landing
components/
  layout/                  # AppShell, sidebar, breadcrumbs, page header
  marketing/               # Hero, FeatureGrid, Approach, Footer
  quiz/                    # Quiz authoring + attempt components
  admin/                   # Admin tools (BulkImport, formulars)
  ui/                      # shadcn primitives
lib/
  auth.ts                  # Server-side role/paid guards
  basePath.ts              # /learning prefix helpers
  serverRedirect.ts        # Base-path-aware next/navigation wrappers
  featureFlags.ts          # paymentsEnabled, isStudentEntitled
  env.ts                   # Zod-validated env loader (Node runtimes only)
  rateLimit.ts             # Upstash + in-memory fallback
  api/errors.ts            # ApiError + jsonError standardised responses
  audit.ts                 # logAudit() — written to audit_log table
  grading.ts               # OpenAI grader + deterministic fallback
  stripe.ts                # Lazy-initialised Stripe client (Proxy)
app/db/
  schema.ts                # Drizzle schema (users, courses, sections, quizzes, attempts, audit_log, stripe_events)
  index.ts                 # Pool-backed Drizzle instance
drizzle/
  *.sql                    # Migration files
scripts/
  preflight.ts             # Pre-migration data-integrity checks
  reconcile-drizzle-history.ts
  backfill-stripe-customer.ts
  apply-migration.ts       # Manual fallback when drizzle-kit migrate misbehaves
tests/
  unit/                    # Pure-function tests
  integration/             # DB-backed (Neon test branch)
  helpers/                 # TestDb, factories
```

---

## Database

Schema lives in [`app/db/schema.ts`](./app/db/schema.ts). All `timestamp`s are `timestamptz`, foreign keys have explicit `onDelete` policies, and `quizzes` / `sections` / `courses` use partial-indexed soft-delete (`deleted_at IS NULL`).

```bash
# Generate a new migration after editing schema
npm run migrate:generate

# Apply pending migrations
npm run migrate

# Run the destructive-migration preflight (duplicate scan etc.)
npm run db:preflight

# Backfill Stripe customer ids (one-time, after enabling paywall)
npm run db:backfill-stripe-customer
```

If `drizzle-kit migrate` ever fails silently, [`scripts/apply-migration.ts`](./scripts/apply-migration.ts) applies a SQL file directly through the Neon Pool.

---

## Testing

```bash
npm test            # one-shot
npm run test:watch
```

- Unit tests cover env validation, rate limiter, error helpers, dev-gate, base-path filters, passing-score logic, and grading.
- Integration tests run against a Neon test branch and require `TEST_DATABASE_URL` to be set; they cover Stripe webhook idempotency, enrollment paths, and admin CRUD with audit log.
- CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs typecheck and tests on every push to `main` and every pull request.

---

## Deployment

Deployment is Vercel-native. The full pre-flight is in [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md). The short version:

1. Set every env var in the Production environment scope. `NEXT_PUBLIC_*` are inlined at build time, so always redeploy after changing them.
2. Apply migrations against the production database (`npm run migrate` from a CI runner with `DATABASE_URL` set, or `scripts/apply-migration.ts` for one-off SQL).
3. Configure Clerk **Component paths** to "application domain" with `/learning/login` and `/learning/signup`.
4. Register the Stripe webhook at `https://<your-domain>/learning/api/stripe/webhook` (only when payments are enabled).
5. Confirm `https://<your-domain>/learning` renders, then `/learning/dashboard/admin` while signed-out 307s to `/learning/login`.

---

## Architectural notes

- **Edge vs Node runtimes.** Middleware runs on Vercel Edge — it never imports the database, the env validator, or any Node-only module. Heavy logic (DB, OpenAI, Stripe) lives in Node serverless route handlers.
- **Base path everywhere.** `/learning` is the app prefix. Every helper that builds URLs (`withBasePath`, `apiUrl`, `appRedirect`) prepends it. Putting `/learning` directly into env vars or `tunnelRoute` produces double prefixes — don't.
- **Authorisation in depth.** Middleware enforces "must be logged in"; pages enforce role + paid; API routes re-check both. A bug in any single layer cannot leak data on its own.
- **Idempotent webhooks.** Every Stripe event id is recorded in `stripe_events` before the handler runs. On handler failure the row is deleted so the next retry can re-process.
- **Audit log.** Sensitive mutations (admin role changes, course/section/quiz deletes, payments updates) write to `audit_log` with actor, action, target, and metadata.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Next dev server. |
| `npm run build` | Production build (also runs typecheck via Next). |
| `npm run start` | Run the production build. |
| `npm run typecheck` | Strict `tsc --noEmit`. |
| `npm run lint` | Next/ESLint. |
| `npm run migrate` | Apply pending Drizzle migrations. |
| `npm run migrate:generate` | Generate a new migration from schema diff. |
| `npm run db:preflight` | Pre-migration data-integrity checks. |
| `npm run db:reconcile-history` | Re-sync Drizzle's migration history table from existing SQL files. |
| `npm run db:backfill-stripe-customer` | One-time backfill of `users.stripe_customer_id`. |
| `npm test` | Run Vitest once. |
| `npm run test:watch` | Watch-mode Vitest. |

---

## License

Proprietary. All rights reserved. Contact the maintainers for licensing or pilot programs.