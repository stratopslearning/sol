# Architecture & education-record data flow

```
Students / Faculty / Admins
        │
        ▼
┌───────────────────┐
│  Next.js on Vercel │  TLS terminated at edge
│  Clerk session     │
└─────────┬─────────┘
          │
          ├──► Neon Postgres (education records at rest)
          │         └── audit_log (append-only)
          │
          ├──► OpenAI API (minimized answer/transcript text only;
          │         Zero Data Retention / no-train — see AI_EDUCATION_RECORDS.md)
          │
          ├──► Stripe (if paywall enabled)
          ├──► Upstash Redis (rate-limit counters only)
          └──► Sentry (errors; default PII off in production)
```

Trust boundary for FERPA: application + Neon. OpenAI, Clerk, Vercel, Stripe, Upstash, and Sentry are **subprocessors** listed in [`SUBPROCESSORS.md`](./SUBPROCESSORS.md).
