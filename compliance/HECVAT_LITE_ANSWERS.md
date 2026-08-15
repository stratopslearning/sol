# HECVAT Lite answers (SOL)

Internal answer pack for higher-ed security questionnaires (including FGCU-style HECVAT Lite reviews).  
**Not a substitute for the official HECVAT Excel workbook** — copy these answers into the institution’s form.

**Product:** SOL (coursework / short-answer grading platform)  
**Vendor entity:** SOL Learning (update legal name if different on contracts)  
**Primary contact (security / privacy):** ops contact named in the institution FERPA rider  
**Last updated:** 2026-08-12  
**SOC 2:** No (self-audit binder only — see [`README.md`](./README.md))

---

## Company overview

| Topic | Answer |
| --- | --- |
| Business structure | Early-stage edtech product; small founding team. No separate CISO office — security ownership is the founder / engineering lead. |
| Dedicated security function | No dedicated security department. Controls are documented in this binder and enforced in application code + cloud provider features. |
| Offshoring of development / support | None planned for production engineering or support of education records. State current reality on the workbook if personnel change. |
| Recent material outages | Document any SEV1 outages in the IR log when they occur. None are claimed here by default — update before submission. |
| Hosting geography | Application on Vercel; primary DB on Neon Postgres. Confirm current region with Neon/Vercel project settings before submission (prefer US for FGCU). |

---

## Documentation

| Question theme | Answer | Cite |
| --- | --- | --- |
| SOC 2 / ISO 27001 | **No** third-party attestation. Compensating package: this binder + control matrix. | [`CONTROL_MATRIX.md`](./CONTROL_MATRIX.md), [`SELF_AUDIT.md`](./SELF_AUDIT.md) |
| Privacy policy | **Yes** — public Privacy Policy on the product site. | `/learning/privacy` (see app route `app/privacy/page.tsx`) |
| Terms of use | **Yes** — public Terms. | `/learning/terms` |
| BCP / DRP | **Yes** — documented; annual restore drill required. | [`policies/BUSINESS_CONTINUITY.md`](./policies/BUSINESS_CONTINUITY.md), [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md), [`evidence/BACKUP_RESTORE_DRILL.md`](./evidence/BACKUP_RESTORE_DRILL.md) |
| Incident response | **Yes** | [`policies/INCIDENT_RESPONSE.md`](./policies/INCIDENT_RESPONSE.md), [`evidence/IR_TABLETOP_TEMPLATE.md`](./evidence/IR_TABLETOP_TEMPLATE.md) |
| Change management | **Yes** — PR review, CI, protected `main` | [`policies/CHANGE_MANAGEMENT.md`](./policies/CHANGE_MANAGEMENT.md) |
| Vulnerability management | **Yes** — Dependabot + `npm audit` cadence | [`policies/VULNERABILITY_MANAGEMENT.md`](./policies/VULNERABILITY_MANAGEMENT.md) |
| Data retention / disposal | **Yes** — term + 3 years default; soft-delete + admin purge; institution-directed | [`policies/DATA_RETENTION.md`](./policies/DATA_RETENTION.md), [`evidence/RETENTION_PURGE_CHECKLIST.md`](./evidence/RETENTION_PURGE_CHECKLIST.md) |
| Subprocessors | **Yes** | [`SUBPROCESSORS.md`](./SUBPROCESSORS.md) |
| FERPA / school official | Contract template; customize with counsel per institution | [`FERPA_RIDER.md`](./FERPA_RIDER.md) |

---

## IT accessibility

| Question theme | Answer | Cite |
| --- | --- | --- |
| VPAT / ACR | **Self-assessed ACR in progress** — see [`VPAT.md`](./VPAT.md). Not a third-party Section 508 VPAT yet. | [`VPAT.md`](./VPAT.md) |
| WCAG target | WCAG 2.1 Level AA target for critical flows (login, enroll, quiz take, gradebook). Known gaps listed in VPAT. | [`VPAT.md`](./VPAT.md) |
| Keyboard operability | Partial — standard interactive controls use accessible primitives; full keyboard audit of every screen is ongoing. | [`VPAT.md`](./VPAT.md) |

---

## Application security

| Question theme | Answer | Cite |
| --- | --- | --- |
| RBAC / ABAC | **Yes** — roles `STUDENT` / `PROFESSOR` / `ADMIN`; resource scoping by section enrollment | `lib/auth.ts`, `lib/quizAccess.ts` |
| WAF | **Yes** — Vercel Firewall active on production (verified 2026-08-11). Bot Protection still to enable. Plus CSP/HSTS and Upstash rate limits. | [`WAF_VERCEL.md`](./WAF_VERCEL.md) |
| Security headers | **Yes** — CSP, HSTS, frame deny, etc. | `next.config.ts` |
| CSRF (cookie APIs) | **Yes** — same-origin Origin/Referer check on mutating `/api/*`; Bearer/MCP/webhooks/cron exempt | `lib/api/sameOrigin.ts`, `middleware.ts` |
| Request size limits | **Yes** — JSON body byte caps + Zod field maxes | `lib/api/readJsonBody.ts` |
| Rate limiting | **Yes** — Upstash required in production | `lib/rateLimit.ts`, `PRODUCTION_DEPLOY.md` |
| DB least privilege | **Partial** — `sol_app` / `sol_migrator` SQL + runbook shipped; apply in Neon before claiming pass | `scripts/sql/create-app-role.sql`, `PRODUCTION_DEPLOY.md` §4b |
| Software supply chain | Dependabot + vulnerability policy; run `npm audit` before submission and attach output | [`policies/VULNERABILITY_MANAGEMENT.md`](./policies/VULNERABILITY_MANAGEMENT.md) |
| Secure SDLC | Authz checks, Zod validation, secrets via env | [`policies/SECURE_DEVELOPMENT.md`](./policies/SECURE_DEVELOPMENT.md) |

---

## Authentication & session management

| Question theme | Answer | Cite |
| --- | --- | --- |
| Auth provider | Clerk | `middleware.ts`, `lib/auth.ts` |
| SSO (SAML2 / OIDC / CAS) | **OIDC via Clerk** for end users today. **SAML / campus IdP** available via Clerk Enterprise SSO — FGCU wiring plan in [`SSO_FGCU_PLAN.md`](./SSO_FGCU_PLAN.md). Not yet connected to FGCU IdP until Enterprise + IdP federation completed. | [`SSO_FGCU_PLAN.md`](./SSO_FGCU_PLAN.md), [`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md) |
| MFA | Configurable in Clerk (recommended for faculty/admin and FGCU org). Document production settings per [`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md). | [`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md) |
| Session timeout / inactivity | Configured in Clerk Dashboard (session lifetime + inactivity). Target settings documented in [`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md). | [`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md) |
| Lockout | Clerk brute-force / lockout protections — enable and screenshot per runbook | [`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md) |
| Audit logging | **Yes** for sensitive app actions (role change, gradebook view/export, purge, enrollment, MCP) with timestamp, actor, IP, user-agent. Clerk session create/end mirrored into `audit_log` via webhook (`auth.session.*`) once the Dashboard endpoint + `CLERK_WEBHOOK_SIGNING_SECRET` are live. | `lib/audit.ts`, `app/api/clerk/webhook`, admin Audit UI |

---

## Data

| Question theme | Answer | Cite |
| --- | --- | --- |
| Restricted / education records | **Yes** — rosters, attempts, grades, discussion transcripts tied to student identifiers | [`DATA_INVENTORY.md`](./DATA_INVENTORY.md) |
| Tenancy | **Shared multi-customer Postgres** (single deployment). Isolation by authentication + RBAC + section enrollment — **not** per-institution DB schemas. Acceptable for single-institution pilot; future `institutionId` scoping planned if multi-school. | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Encryption in transit | **Yes** — TLS at Vercel edge; HSTS | `next.config.ts` |
| Encryption at rest | **Yes** — Neon Postgres encryption at rest; PITR backups | [`SUBPROCESSORS.md`](./SUBPROCESSORS.md), [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) |
| Email of grades / rosters | **No** — application does not email quiz results, rosters, or grades | Privacy Policy; no outbound mailer for education records |
| Exports | Authenticated CSV download over HTTPS; FERPA handling acknowledgment required in UI before download. Files are not password-encrypted at rest on the user’s device — faculty are warned. | Export UI; `education.grades.export` audit |
| AI subprocessors | OpenAI for grading/discussions with minimization + ZDR/no-train requirement | [`AI_EDUCATION_RECORDS.md`](./AI_EDUCATION_RECORDS.md), [`evidence/OPENAI_ZDR_CHECKLIST.md`](./evidence/OPENAI_ZDR_CHECKLIST.md) |
| Data residency | Prefer US regions; confirm Neon + Vercel project region before FGCU submission | Neon / Vercel consoles |

---

## Honest “No” / partial list (do not overclaim)

- SOC 2 Type I / Type II — **No**
- Third-party pen test report — **No** (unless separately commissioned)
- Completed third-party VPAT — **No** (self-ACR only until commissioned)
- Campus SAML connected to FGCU — **Not yet** (plan ready)
- Neon `sol_app` least-privilege role applied in production — **Not yet** (SQL + runbook ready)
- Clerk auth webhook live in production — **Code ready; wire Dashboard + secret**
- Dedicated CISO / security team — **No**
- Per-institution database tenancy — **No**
- Encrypted-at-rest CSV files on faculty laptops — **No** (policy + UI warning)

---

## Packet checklist before sending to FGCU

- [ ] Copy answers into official HECVAT Lite workbook
- [ ] Attach Privacy Policy + Terms URLs
- [ ] Attach filled evidence: ZDR, access review, restore drill, IR tabletop
- [ ] Attach Clerk auth settings screenshots ([`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md))
- [ ] Attach Vercel Firewall screenshot after enablement ([`WAF_VERCEL.md`](./WAF_VERCEL.md))
- [ ] Counsel-reviewed FERPA rider draft for FGCU
- [ ] Confirm US hosting regions
