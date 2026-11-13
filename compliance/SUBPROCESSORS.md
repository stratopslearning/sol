# Subprocessors

Vendors that may process SOL data, including education records, on behalf of the institution.

| Vendor | Purpose | Data typically processed | Notes |
| --- | --- | --- | --- |
| Clerk | Authentication | Email, name, auth identifiers | Production instance only |
| Neon | Primary database | All education records | Encrypted at rest; PITR |
| Vercel | Hosting / serverless | Request data, logs | Preview protection required |
| OpenAI | Grading + discussion AI + material embeddings | Minimized answer/transcript text; course material text chunks for embeddings | ZDR / no-train — see AI_EDUCATION_RECORDS.md |
| Amazon Web Services (S3) | Course material file storage (Knowledge module) | Uploaded PDFs/DOCX/TXT and related object metadata | Private buckets; SSE-S3; region per deploy (dev: us-west-1) |
| Stripe | Payments (if enabled) | Email, customer id, payment metadata | Live keys only in prod |
| Upstash | Rate limiting | Opaque rate-limit keys (user/IP ids) | Required in production |
| Sentry | Error monitoring | Stack traces; **default PII off in prod**; **session replay disabled** | Errors/traces only; no DOM session recording |
| Braintrust | LLM/agent observability + evals | Minimized answer/transcript text in traces; MCP tool names and outcome classes only (no gradebook payloads) | DPA required before prod tracing; no-train; retention cap — see AI_EDUCATION_RECORDS.md |

Update this list before onboarding a new vendor. Institution-facing contracts should incorporate [`FERPA_RIDER.md`](./FERPA_RIDER.md).
