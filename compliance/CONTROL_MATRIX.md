# SOL Internal Control Matrix (SOC 2 TSC + FERPA)

Internal self-audit checklist. Mimics SOC 2 Type I (design) and Type II (operating effectiveness) plus FERPA education-record expectations. **No third-party auditor required.**

**Criteria in scope:** Security (CC), Confidentiality (C), Processing Integrity (PI), FERPA (F).

**How to use**

1. After each hardening release, walk every row (Type I–style design review).
2. Quarterly, file evidence under [`evidence/`](./evidence/) and update Status (Type II–style).
3. Status values: `pass` | `gap` | `partial`.

Last design walkthrough: see [`evidence/TYPE1_WALKTHROUGH.md`](./evidence/TYPE1_WALKTHROUGH.md).

---

## Security (CC)

| ID | Requirement | SOL implementation | Evidence | Status |
| --- | --- | --- | --- | --- |
| CC-01 | Unique authentication for users | Clerk auth; [`middleware.ts`](../middleware.ts); [`lib/auth.ts`](../lib/auth.ts) | Clerk prod instance; login smoke | pass |
| CC-02 | Role-based authorization | `requireAdmin` / `requireProfessor` / `requireStudent`; API role checks; [`lib/quizAccess.ts`](../lib/quizAccess.ts) | Authz tests; sample denied requests | pass |
| CC-03 | Secrets not in source | Env via [`lib/env.ts`](../lib/env.ts); Vercel env; no secrets in repo | `PRODUCTION_DEPLOY.md`; env boot fail | pass |
| CC-04 | Encryption in transit | HTTPS via Vercel; DB TLS via Neon connection string | Vercel/Neon console screenshots | pass |
| CC-05 | Encryption at rest | Neon Postgres default encryption | Neon docs + restore drill | pass |
| CC-06 | Security headers | [`next.config.ts`](../next.config.ts) `headers()` (HSTS, CSP, etc.) | curl -I production | pass |
| CC-07 | Rate limiting | [`lib/rateLimit.ts`](../lib/rateLimit.ts); Upstash **required in production** | 429 smoke; env validation | pass |
| CC-08 | Audit logging of privileged actions | [`lib/audit.ts`](../lib/audit.ts); exam `quiz.attempt.start` / `quiz.attempt.submit`; admin UI [`app/dashboard/admin/audit`](../app/dashboard/admin/audit) | Sample `audit_log` rows | pass |
| CC-09 | Change management | PRs + [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | CI runs; branch protection notes | pass |
| CC-10 | Vulnerability management | Dependabot / `npm audit` cadence in [`policies/VULNERABILITY_MANAGEMENT.md`](./policies/VULNERABILITY_MANAGEMENT.md) | Quarterly audit notes | pass |
| CC-11 | Incident response | [`policies/INCIDENT_RESPONSE.md`](./policies/INCIDENT_RESPONSE.md) | Tabletop in `evidence/` | pass |
| CC-12 | Backup & recovery | Neon PITR; [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) | Annual restore drill | pass |
| CC-13 | Monitoring | Sentry (PII off in prod); Vercel/Neon metrics | Sentry project config | pass |
| CC-14 | Cron / job auth | `CRON_SECRET` on grade-pending cron | Cron logs | pass |
| CC-15 | Payments flag before charging | Set `NEXT_PUBLIC_PAYMENTS_ENABLED=true` in Vercel Production before charging $10/student. Default remains `false` for unpaid pilots. | Vercel env screenshot | n/a until go-live |

---

## Confidentiality (C)

| ID | Requirement | SOL implementation | Evidence | Status |
| --- | --- | --- | --- | --- |
| C-01 | Classify education records | [`DATA_INVENTORY.md`](./DATA_INVENTORY.md); default = education record | Inventory review | pass |
| C-02 | Least privilege to records | Role gates; feedback redaction in quizAccess | Gradebook authz tests | pass |
| C-03 | Subprocessor inventory | [`SUBPROCESSORS.md`](./SUBPROCESSORS.md) | Signed vendor terms checklist | pass |
| C-04 | No PII in prod observability | `sendDefaultPii: !isProd` in Sentry configs | Sentry settings | pass |
| C-05 | Soft-delete + purge | Admin soft-delete + purge routes | Purge audit rows | pass |

---

## Processing Integrity (PI)

| ID | Requirement | SOL implementation | Evidence | Status |
| --- | --- | --- | --- | --- |
| PI-01 | Deterministic grading path | Rubric match → TS score; [`lib/grading.ts`](../lib/grading.ts) | Unit tests | pass |
| PI-02 | Fallback when AI unavailable | Deterministic / pending status; no silent fake scores | `grading.test.ts` | pass |
| PI-03 | Stripe webhook idempotency | `stripe_events` unique event id | Integration tests | pass |
| PI-04 | Chatbot never leaks answer keys | [`lib/chatbot/safeQuizContext.ts`](../lib/chatbot/safeQuizContext.ts) | Unit tests | pass |

---

## FERPA (F)

| ID | Requirement | SOL implementation | Evidence | Status |
| --- | --- | --- | --- | --- |
| F-01 | Education-record inventory | [`DATA_INVENTORY.md`](./DATA_INVENTORY.md) | Inventory | pass |
| F-02 | Legitimate educational use | [`policies/FERPA_EDUCATION_RECORDS.md`](./policies/FERPA_EDUCATION_RECORDS.md); [`FERPA_RIDER.md`](./FERPA_RIDER.md) | Rider template | pass |
| F-03 | School-official subprocessors | [`SUBPROCESSORS.md`](./SUBPROCESSORS.md); OpenAI ZDR posture in [`AI_EDUCATION_RECORDS.md`](./AI_EDUCATION_RECORDS.md) | OpenAI org checklist | pass |
| F-04 | Prompt minimization (no profile PII to AI) | [`lib/ai/minimizeEducationPayload.ts`](../lib/ai/minimizeEducationPayload.ts) used by grading + chatbot | Unit tests | pass |
| F-05 | Disclosure / access logging | Enrollment, role change, gradebook view, export, purge → `audit_log` | Admin audit UI samples | pass |
| F-06 | Access / amend / delete rights | Soft-delete + purge; [`policies/DATA_RETENTION.md`](./policies/DATA_RETENTION.md) | Purge checklist evidence | pass |
| F-07 | Redisclosure controls | FERPA rider + no public grade APIs | Rider + authz | pass |
| F-08 | Institution disclosure requests | Audited via [`app/api/admin/disclosure`](../app/api/admin/disclosure) | Audit action `ferpa.disclosure.record` | pass |

---

## Recurring Type II–style checks

See [`SELF_AUDIT.md`](./SELF_AUDIT.md) and templates under [`evidence/`](./evidence/).
