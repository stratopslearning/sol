# Subprocessors

Vendors that may process SOL data, including education records, on behalf of the institution.

| Vendor | Purpose | Data typically processed | Notes |
| --- | --- | --- | --- |
| Clerk | Authentication | Email, name, auth identifiers | Production instance only |
| Neon | Primary database | All education records | Encrypted at rest; PITR |
| Vercel | Hosting / serverless | Request data, logs | Preview protection required |
| OpenAI | Grading + discussion AI | Minimized answer/transcript text | ZDR / no-train — see AI_EDUCATION_RECORDS.md |
| Stripe | Payments (if enabled) | Email, customer id, payment metadata | Live keys only in prod |
| Upstash | Rate limiting | Opaque rate-limit keys (user/IP ids) | Required in production |
| Sentry | Error monitoring | Stack traces; **default PII off in prod** | Review scrubbing rules |
| Braintrust | LLM/agent observability + evals | Minimized answer/transcript text in traces; MCP tool names and outcome classes only (no gradebook payloads) | DPA required before prod tracing; no-train; retention cap — see AI_EDUCATION_RECORDS.md |

Update this list before onboarding a new vendor. Institution-facing contracts should incorporate [`FERPA_RIDER.md`](./FERPA_RIDER.md).
