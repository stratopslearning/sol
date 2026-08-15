# Architecture & education-record data flow

```
Students / Faculty / Admins
        │
        ▼
┌───────────────────┐
│  Next.js on Vercel │  TLS terminated at edge
│  Clerk session     │  same-origin CSRF on cookie mutations
└─────────┬─────────┘
          │
          ├──► Neon Postgres (education records at rest)
          │         ├── DATABASE_URL → sol_app (DML only)
          │         ├── DATABASE_MIGRATE_URL → sol_migrator (DDL / CI)
          │         ├── audit_log (append-only)
          │         └── clerk_events / stripe_events (webhook idempotency)
          │
          ├──► OpenAI API (minimized answer/transcript text only;
          │         Zero Data Retention / no-train — see AI_EDUCATION_RECORDS.md)
          │
          ├──► Stripe (if paywall enabled)
          ├──► Upstash Redis (rate-limit counters only)
          └──► Sentry (errors; default PII off in production)
```

Trust boundary for FERPA: application + Neon. OpenAI, Clerk, Vercel, Stripe, Upstash, and Sentry are **subprocessors** listed in [`SUBPROCESSORS.md`](./SUBPROCESSORS.md).

## Database roles

See [`scripts/sql/create-app-role.sql`](../scripts/sql/create-app-role.sql) and [`PRODUCTION_DEPLOY.md`](../PRODUCTION_DEPLOY.md) §4b. Runtime traffic must never use a role that can `CREATE`/`DROP`/`ALTER` tables.
