# HECVAT Lite 3.06 — Vendor Response (SOL)

**Questionnaire:** Higher Education Community Vendor Assessment Toolkit — Lite, version 3.06 (EDUCAUSE / Internet2 / REN-ISAC).  
**This file is the complete vendor response.** Copy column **Vendor Answer** and **Additional Information** into the institution’s official HECVAT Excel workbook. Do not treat this markdown as a substitute for that workbook’s Analyst / Summary tabs.

**Prepared:** 22 August 2026  
**Product version in scope:** SOL production web application at `https://www.strat-ops.net/learning` (Next.js 15 App Router, base path `/learning`)  
**Vendor:** Strategic Operations LLC (product brand: SOL Learning)  
**Classification of data in scope:** Education records under FERPA (rosters, enrollments, quiz content, attempts, scores, AI grading rationale, discussion transcripts, audit events). Not PHI. Not cardholder data.

**How answers were written:** Every Yes / No / N/A below reflects what the live product and operating model actually do as of this date — including gaps. Do not overclaim.

**Items the operator must fill on the Excel packet before sending (not knowable from the product itself):** GNRL-06 through GNRL-13 (named humans and phone numbers); confirm Vercel project region in the Vercel console (GNRL-14); OpenAI production org Zero Data Retention / no-train screenshot; Clerk Production session-lifetime and MFA-required screenshots; first live Neon restore-fork drill sign-off. Neon production region is recorded below (`aws-us-east-1`).

---

## DATE-01 — Date


| Field             | Value      |
| ----------------- | ---------- |
| **Vendor Answer** | 2026-08-22 |


---

# General Information

## GNRL-01 — Vendor Name


|                   |                          |
| ----------------- | ------------------------ |
| **Vendor Answer** | Strategic Operations LLC |


Legal entity and parent company of the product. Public-facing product brand, Privacy Policy, Terms of Use, and application footer use **SOL Learning**. Institution contracts should name **Strategic Operations LLC**.

## GNRL-02 — Product Name


|                   |     |
| ----------------- | --- |
| **Vendor Answer** | SOL |


## GNRL-03 — Product Description


|                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer** | SOL is a cloud-hosted academic learning management system for higher-education institutions. Faculty author structured, auto-graded coursework (multiple-choice, true/false, and AI-graded short-answer questions with stored model rationale). Students enroll into sections by code, take quizzes, and participate in assigned Socratic discussion chatbots. Administrators manage users, courses, sections, soft-delete/purge, and an append-only audit log. The application is multi-tenant SaaS: one production deployment, logical isolation by authenticated user, role, and section enrollment. Optional Stripe Checkout paywall is off by default. Faculty may connect institution-approved AI agents through a hosted MCP server using scoped personal access tokens or Clerk OAuth. |


## GNRL-04 — Web Link to Product Privacy Notice


|                   |                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Vendor Answer** | [https://www.strat-ops.net/learning/privacy](https://www.strat-ops.net/learning/privacy) |


Last updated 12 August 2026. Covers education records / FERPA school-official posture, account and coursework data collected, subprocessors by category, AI minimization, retention (active term + 3 years default), security, and the fact that SOL does not email quiz results, rosters, or grades.

Terms of use (companion): [https://www.strat-ops.net/learning/terms](https://www.strat-ops.net/learning/terms)

## GNRL-05 — Web Link to Accessibility Statement or VPAT


|                   |                                                                                                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer** | No public third-party VPAT URL. Self-assessed Accessibility Conformance Report is included in the IT Accessibility section of this HECVAT (ITAC / DOCU-12). Standard targeted: WCAG 2.1 Level AA. Status: partially supports; not a Section 508 third-party VPAT. |


## GNRL-06 — Vendor Contact Name


|                   |             |
| ----------------- | ----------- |
| **Vendor Answer** | Piyush Shah |


Security ownership is the founder / engineering lead. There is no separate CISO office.

## GNRL-07 — Vendor Contact Title


|                   |         |
| ----------------- | ------- |
| **Vendor Answer** | Founder |


## GNRL-08 — Vendor Contact Email


|                   |                                                       |
| ----------------- | ----------------------------------------------------- |
| **Vendor Answer** | [piyushashah@gmail.com](mailto:piyushashah@gmail.com) |


## GNRL-09 — Vendor Contact Phone Number


|                   |            |
| ----------------- | ---------- |
| **Vendor Answer** | 6023945265 |


## GNRL-10 — Vendor Accessibility Contact Name


|                   |             |
| ----------------- | ----------- |
| **Vendor Answer** | Piyush Shah |


## GNRL-11 — Vendor Accessibility Contact Title


|                   |         |
| ----------------- | ------- |
| **Vendor Answer** | Founder |


## GNRL-12 — Vendor Accessibility Contact Email


|                   |                                                       |
| ----------------- | ----------------------------------------------------- |
| **Vendor Answer** | [piyushashah@gmail.com](mailto:piyushashah@gmail.com) |


## GNRL-13 — Vendor Accessibility Contact Phone Number


|                   |            |
| ----------------- | ---------- |
| **Vendor Answer** | 6023945265 |


## GNRL-14 — Vendor Hosting Regions


|                   |                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer** | United States. Application compute: Vercel. Primary database: Neon serverless Postgres on **Amazon Web Services (AWS)**, region `aws-us-east-1` (N. Virginia). Authentication: Clerk. Education records at rest: Neon on AWS. |


Neon is a managed Postgres service; compute and storage for the SOL production project run in **AWS data centers** in US East (N. Virginia), hostname `us-east-1.aws.neon.tech`. Confirm the Vercel project region in the Vercel console (Vercel also typically places US production on AWS). Preview/staging must use separate Clerk and Neon credentials from production. Edge TLS is terminated at Vercel.

## GNRL-15 — Vendor Work Locations


|                   |                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer** | United States. Early-stage founding team. No offshore development or support of education records is planned. Confirm current personnel locations if the team changes before contract signature. |


Subprocessor personnel (Clerk, Neon, Vercel, OpenAI, Stripe, Upstash, Sentry, Braintrust) may operate globally under those vendors’ own SOC / DPA terms. SOL’s own engineering and support of education records is not offshored.

---

# Company Overview

## COMP-01 — Describe your organization’s business background and ownership structure, including all parent and subsidiary relationships.


|                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer** | Strategic Operations LLC is a U.S. limited liability company and the parent / contracting entity for SOL. SOL Learning is the product brand (higher-education coursework / short-answer grading SaaS), not a separate subsidiary. There are no other parent companies and no subsidiaries as of this date. There is no separate CISO office. Security, privacy, and engineering ownership sit with the founder / engineering lead. The product is not a general marketplace and not a consumer social product. |


## COMP-02 — Have you had an unplanned disruption to this product/service in the past 12 months?


|                            |                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                    |
| **Additional Information** | No SEV1 (confirmed unauthorized access to education records, or production-secret leak) is recorded in the incident log as of 22 August 2026. If a material outage or breach occurs after this date, update this answer and attach the incident record before submission. |


## COMP-03 — Do you have a dedicated Information Security staff or office?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Additional Information** | There is no dedicated security department. The founder / engineering lead owns information security, including policy, monitoring, vulnerability management, and incident response. Cloud-provider controls (Vercel Firewall, Neon encryption/PITR, Clerk attack protection, Sentry) are used as compensating technical controls. Plan: retain founder ownership until headcount supports a named security lead; no CISO hire is claimed. |


## COMP-04 — Do you have a dedicated Software and System Development team(s)?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Additional Information** | All SOL application software is developed in-house. The team is small and cross-functional (product, engineering, operations). There is no outsourced development of the production application. Functions covered in-house: product design, application engineering, database migrations, CI, production operations, faculty/student support at the application layer. Subprocessors provide infrastructure (hosting, auth, DB, AI inference, payments, rate limiting, error monitoring), not feature development. |


## COMP-05 — Does your product process protected health information (PHI) or any data covered by the Health Insurance Portability and Accountability Act?


|                            |                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                   |
| **Additional Information** | SOL processes FERPA education records (roster, enrollment, assessment, grades, discussion transcripts), not HIPAA PHI. SOL is not a HIPAA covered entity or business associate for this product. Institutions must not store PHI in quiz answers or discussion messages. |


## COMP-06 — Will data regulated by PCI DSS reside in the vended product?


|                            |                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                                                        |
| **Additional Information** | Cardholder data does not reside in SOL. When the optional paywall is enabled (`NEXT_PUBLIC_PAYMENTS_ENABLED=true`), Stripe Checkout collects payment details on Stripe-hosted pages. SOL stores only Stripe customer id, paid flag, and webhook event ids for idempotency. The paywall is **off by default**. |


## COMP-07 — Use this area to share information about your environment that will assist those who are assessing your company data security program.

**Vendor Answer (narrative):**

SOL is shared-tenant SaaS.

**Trust boundary (education records):** The Next.js application on Vercel plus Neon Postgres. Users authenticate with Clerk. Application roles are `STUDENT`, `PROFESSOR`, and `ADMIN`. Authorization is enforced on every page and API that reads education records (role gates plus section enrollment / quiz ownership). Cross-role access attempts redirect to the user’s own dashboard.

**Data flow (production):**

1. Browser → Vercel (TLS at edge; HSTS; CSP; X-Frame-Options DENY; same-origin CSRF check on cookie-authenticated mutating `/api/*`).
2. Clerk session (or professor MCP Bearer token) → application maps to a SOL `users` row (`clerkId`, email, names, role).
3. Education records persist in Neon Postgres **hosted on AWS** in `aws-us-east-1` (users, enrollments, quizzes, questions, assignments, attempts with answers JSON and `gptFeedback`, discussion transcripts, append-only `audit_log`). Runtime DB role is intended to be DML-only (`sol_app`); DDL uses a separate migrator role (`sol_migrator`). Applying that split in Neon is recommended before broad institutional rollout (SQL/runbook exists; treat as **partial** until the operator confirms it is applied in production).
4. OpenAI API receives **minimized** student answer / transcript text and rubric context for short-answer grading and Socratic chat. Application code does not send student name, email, or Clerk IDs in prompts; email-shaped strings in student text are redacted. Production requirement: API/Enterprise workspace, training on customer content disabled, Zero Data Retention (or strongest no-retention option). Operator must verify those console settings before packet submission.
5. Stripe (only if paywall on): Checkout + webhooks; `stripe_events` unique event id for idempotency.
6. Upstash Redis: rate-limit counters only (opaque keys). Required in production; app refuses to boot without it.
7. Sentry: errors; default PII sending is off in production.
8. Braintrust (optional): LLM/agent trace + eval platform; minimized answer/transcript text when enabled; MCP traces are tool-name/outcome only. Requires DPA before production enablement.

**Application does not:** email grades/rosters/results; expose public grade APIs; use production secrets in Preview; log education-record PII in production application logs by design.

**Faculty Agent Access (MCP):** Professors/admins may call the same professor services via `/api/mcp` using (a) hashed personal access tokens (`sol_pat_…`, scopes, revocation) or (b) Clerk OAuth. Students cannot call tools. Gradebook/export/transcript tool calls write the same FERPA audit actions as the dashboard, plus `mcp.tool.call`. Data returned goes to the professor’s own client; institutions should require approved agents only.

**Tenancy:** Logical, not per-institution database schemas. Acceptable for a single-institution pilot. Multi-school `institutionId` isolation is planned if SOL is offered to multiple campuses on one database.

---

# Documentation

## DOCU-01 — Have you undergone a SSAE 18 / SOC 2 audit?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Additional Information** | SOL has not completed a third-party SOC 2 Type I or Type II. Compensating package: this HECVAT; written information-security, access-control, change-management, vulnerability, incident-response, BCP/DR, vendor-management, FERPA, and retention policies; an internal control matrix covering Security, Confidentiality, Processing Integrity, and FERPA; Type I–style design walkthrough dated 9 August 2026. Hosting providers (Vercel, Neon) publish their own SOC 2 Type 2 reports (see HLDC-03). |


## DOCU-02 — Have you completed the Cloud Security Alliance (CSA) CAIQ?


|                            |                                                                           |
| -------------------------- | ------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                    |
| **Additional Information** | No CAIQ is published. This HECVAT Lite is the vendor assessment artifact. |


## DOCU-03 — Have you received the Cloud Security Alliance STAR certification?


|                   |        |
| ----------------- | ------ |
| **Vendor Answer** | **No** |


## DOCU-04 — Do you conform with a specific industry standard security framework? (e.g., NIST Cybersecurity Framework, CIS Controls, ISO 27001, etc.)


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Additional Information** | Internally mapped to SOC 2 Trust Services Criteria (Security, Confidentiality, Processing Integrity) plus FERPA education-record handling. **Not** ISO 27001 certified. **Not** NIST CSF certified. **Not** FedRAMP. Controls implemented in product: unique auth (Clerk), RBAC, secrets only in environment variables, TLS, provider encryption at rest, security headers, production rate limiting, privileged-action audit log, PR+CI change control, Dependabot/`npm audit` vulnerability cadence, documented IR, Neon PITR backups, Sentry monitoring, CSRF origin checks, JSON body size caps. |


## DOCU-05 — Can the systems that hold the institution's data be compliant with NIST SP 800-171 and/or CMMC Level 2 standards?


|                            |                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                       |
| **Additional Information** | SOL is a FERPA SaaS LMS, not a CUI / DFARS 800-171 / CMMC offering. No claim is made that the environment meets NIST SP 800-171 or CMMC Level 2. No plan is committed to offer CMMC Level 3. |


## DOCU-06 — Can you provide overall system and/or application architecture diagrams including a full description of the data flow for all components of the system?


|                            |                                    |
| -------------------------- | ---------------------------------- |
| **Vendor Answer**          | **Yes** (diagram in this response) |
| **Additional Information** |                                    |


```
Students / Faculty / Admins  (browser)
        │  TLS 1.2+ at Vercel edge
        ▼
┌─────────────────────────────────────┐
│  Next.js 15 on Vercel               │
│  Clerk session cookie or MCP Bearer │
│  RBAC: STUDENT / PROFESSOR / ADMIN  │
│  CSP, HSTS, CSRF origin check       │
│  Upstash rate limits                │
└──────────────┬──────────────────────┘
               │
     ┌─────────┼──────────┬─────────────┬──────────┐
     ▼         ▼          ▼             ▼          ▼
 Neon PG    OpenAI     Clerk        Stripe*     Sentry
 on AWS     (minified  (authn)      (paywall    (errors,
 us-east-1  answers)                optional)   PII off)
     │
     ├── users, enrollments, quizzes, attempts, discussions
     ├── audit_log (append-only)
     └── clerk_events / stripe_events (webhook idempotency)
```

Stripe is unused for education records when the paywall flag is false.

No on-premises appliance. No VPN into the institution. All user access is HTTPS to the public application origin.

## DOCU-07 — Does your organization have a data privacy policy?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Additional Information** | Public Privacy Policy: [https://www.strat-ops.net/learning/privacy](https://www.strat-ops.net/learning/privacy) (last updated 12 August 2026). Public Terms: [https://www.strat-ops.net/learning/terms](https://www.strat-ops.net/learning/terms). Institutional FERPA rider (school-official / purpose limitation / redisclosure / subprocessors / breach notice / student rights via institution / deletion / AI processing) is executed per contract — customize named contacts and SLAs with counsel before signature. |


## DOCU-08 — Do you have a documented, and currently implemented, employee onboarding and offboarding policy?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Additional Information** | Unique authentication; no shared production passwords. Cloud consoles (Vercel, Neon, Clerk, OpenAI, Stripe, Sentry, Upstash, GitHub) use unique MFA-backed (or SSO) accounts. Production secrets are not copied into Preview. Access to production systems and education records is only for assigned duties (acceptable-use policy). Offboarding: remove cloud-console and production access within **one business day**. Admin application roles are reviewed at least quarterly. Small-team process: founder-owned checklist rather than an HRIS-driven workflow. |


## DOCU-09 — Do you have a well-documented Business Continuity Plan (BCP) that is tested annually?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (documented; live annual test pending)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Additional Information** | BCP: no durable application state on Vercel; recover by git redeploy. Datastore is Neon Postgres on AWS (`aws-us-east-1`) with point-in-time recovery. RTO target for SEV1 data-loss: restore branch + update `DATABASE_URL` + redeploy, **under 4 hours**. RPO: Neon history retention on the production project is **24 hours** (`history_retention_seconds = 86400`) as of 22 August 2026; re-check the Neon console if the plan changes. Design verification of this procedure: 12 August 2026. **Live restore-fork drill is an annual operating requirement and had not been executed as of this HECVAT date** — do not claim a completed live drill until the operator signs one off. |


## DOCU-10 — Do you have a well-documented Disaster Recovery Plan (DRP) that is tested annually?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (documented; live annual test pending)                                                                                                                                                                                                                                                                                                                                                                                          |
| **Additional Information** | Same as DOCU-09. Production incident restore: (1) Neon restore branch at last-known-good time, (2) validate `users` / `attempts` / discussion sessions / `audit_log` on a non-prod pointer, (3) swap production `DATABASE_URL` or promote per Neon docs, (4) redeploy and verify login + gradebook, (5) rotate credentials if breach-related and follow incident response. App-tier DR is redeploy from git on Vercel (multi-AZ cloud). |


## DOCU-11 — Do you have a documented change management process?


|                            |                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                  |
| **Additional Information** | All production code changes go through pull request and GitHub Actions CI (typecheck, tests against a Neon test branch when secrets are present, lint). Prefer protected `main` with required checks. Environment and secret changes are recorded in Vercel activity / deploy notes. Emergency hotfixes still require a follow-up PR and a postmortem if education records were at risk. |


## DOCU-12 — Has a VPAT or ACR been created or updated for the product and version under consideration within the past year?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (self-assessed ACR, 12 August 2026)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Additional Information** | Internal Accessibility Conformance Report dated 12 August 2026. Standard: WCAG 2.1 Level AA **target**. Evaluation method: code review of critical flows and Radix UI / semantic HTML patterns. **Not** a third-party VPAT/ACR. **Does not claim full WCAG AA or Section 508 conformance.** Full assistive-technology lab testing is not completed. Commission a formal VPAT from an accessibility vendor before claiming full conformance to the institution. Summary of that ACR is restated under IT Accessibility below so this HECVAT stands alone. |


## DOCU-13 — Do you have documentation to support the accessibility features of your product?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Additional Information** | Product is a standard web app (no separate “accessibility mode”). Features that support accessibility today: `main` landmarks on marketing/docs/legal; form labels on primary enrollment and export controls; focus-visible rings on many interactive controls; Radix primitives for dialogs/menus (keyboard and ARIA patterns); `prefers-reduced-motion` respected on parts of marketing motion; `aria-`* / visually-hidden text on several UI primitives. Clerk-hosted sign-in/sign-up widgets inherit Clerk’s accessibility. Known gaps are listed under ITAC-08. CSV/PDF exports are data files, not accessible documents. |


---

# IT Accessibility

**Self-assessed ACR (inlined so this file is independent)**

- **Product:** SOL web coursework platform  
- **Date:** 12 August 2026 (still current as of 22 August 2026)  
- **Standard:** WCAG 2.1 Level AA (target)  
- **Overall:** Partially supports. Does not claim full conformance.  
- **Critical flows in scope:** (1) Sign in / sign up, (2) student section enrollment, (3) take / submit quiz, (4) faculty gradebook and CSV export, (5) public docs / privacy / terms.


| WCAG 2.1 principle | Level A | Level AA | Notes                                                                                                                                         |
| ------------------ | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Perceivable        | Partial | Partial  | Contrast generally follows design tokens; some marketing motion; charts/complex visuals not fully audited.                                    |
| Operable           | Partial | Partial  | Interactive controls largely keyboard-reachable via Radix; dense admin tables and custom marketing animation need deeper keyboard/AT testing. |
| Understandable     | Partial | Partial  | Labels on primary forms; Clerk UI inherits Clerk; error-message consistency varies.                                                           |
| Robust             | Partial | Partial  | Landmarks on marketing/docs; dashboard uses a shared shell.                                                                                   |


**Supports (examples):** skip-capable `main` on docs/legal/marketing; focus rings; reduced-motion in places; form labels on export/enrollment.

**Does not support yet:** third-party VPAT; full keyboard-only pass of every admin/professor table; complete screen-reader table semantics on complex gradebook grids; accessible CSV/PDF as documents; complete live-region announcements for async grading status.

**Remediation:** keyboard + VoiceOver/NVDA pass on the five critical flows; fix high-severity findings before broad institutional rollout; commission formal VPAT; re-test after campus SSO UI changes.

## ITAC-01 — Has a third-party expert conducted an accessibility audit of the most recent version of your product?


|                            |                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                   |
| **Additional Information** | Self-assessment only. Plan: commission an IAAP-accredited or equivalent third-party audit before claiming full WCAG AA / Section 508 to the institution. |


## ITAC-02 — Do you have a documented and implemented process for verifying accessibility conformance?


|                            |                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (lightweight; lab testing incomplete)                                                                                                                                                                                                                                             |
| **Additional Information** | Process today: code review of critical academic flows against WCAG 2.1 AA; use of accessible component primitives; file gaps in the ACR. Not yet implemented: scheduled AT lab (NVDA/VoiceOver/keyboard) on every release. Issues found in review are tracked with other product defects. |


## ITAC-03 — Have you adopted a technical or legal accessibility standard of conformance for the product in question?


|                            |                                                                                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                          |
| **Additional Information** | Adopted target: **WCAG 2.1 Level AA**. Also used as the direction of travel for Section 508 / ADA Title II web content expectations. Current implementation **partially supports** that target; full conformance is not claimed. |


## ITAC-04 — Can you provide a current, detailed accessibility roadmap with delivery timelines?


|                            |                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (high-level)                                                                                                                                                                                                                                                                                                                                                 |
| **Additional Information** | Near-term: (1) keyboard + screen-reader pass on the five critical flows; (2) fix high-severity findings before broad rollout; (3) commission formal VPAT/ACR; (4) re-test after Clerk Enterprise SSO UI is enabled. No multi-year dated public roadmap is published. Delivery is sequential with institutional onboarding, not a fixed calendar of WCAG SC closures. |


## ITAC-05 — Do you expect your staff to maintain a current skill set in IT accessibility?


|                            |                                                                                                                                                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                             |
| **Additional Information** | Engineering is expected to use semantic HTML, labeled forms, keyboard-operable primitives, and to treat a11y defects as product defects. No IAAP WAS / DHS Trusted Tester certifications are held. Skill maintenance is on-the-job plus the ACR remediation plan, not a certified training program. |


## ITAC-06 — Do you have a documented and implemented process for reporting and tracking accessibility issues?


|                            |                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                               |
| **Additional Information** | Users and institutions may report issues through the operations contact on the agreement or via the institution’s SOL administrator. Issues are tracked in the same engineering defect process as other bugs. There is no separate public accessibility-issue portal. |


## ITAC-07 — Do you have documented processes and procedures for implementing accessibility into your development lifecycle?


|                            |                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (partially implemented)                                                                                                                                                                                                                                           |
| **Additional Information** | New UI is expected to use the shared component library (Radix / shadcn patterns with labels and focus styles). PR review includes functional correctness; accessibility is part of secure/quality development expectations but is not a gated automated axe CI job today. |


## ITAC-08 — Can all functions of the application or service be performed using only the keyboard?


|                            |                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                                                                                                                    |
| **Additional Information** | Primary academic flows (login, enroll, take quiz, gradebook, export) are **intended** to be keyboard operable and use accessible primitives, but a full keyboard-only verification of **every** admin and professor function (including dense tables and marketing surfaces) has not been completed. Answering Yes would overclaim. Clerk-hosted widgets depend on Clerk. |


## ITAC-09 — Does your product rely on activating a special "accessibility mode," a "lite version," or accessing an alternate interface for accessibility purposes?


|                            |                                                 |
| -------------------------- | ----------------------------------------------- |
| **Vendor Answer**          | **No**                                          |
| **Additional Information** | One web interface. No separate accessible mode. |


---

# Application / Service Security

## HLAP-01 — Are access controls for institutional accounts based on structured rules, such as RBAC, ABAC, or PBAC?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Additional Information** | **RBAC** with resource scoping: roles `STUDENT`, `PROFESSOR`, `ADMIN`. New accounts default to `STUDENT` until an admin promotes faculty. Students see only their enrollments, attempts, and grades. Professors see sections they teach (faculty enrollment code) and quizzes they author. Admins manage users, catalog, audit log, soft-delete and purge. Quiz access additionally requires section assignment / enrollment. Professor MCP tokens add **scopes** (`read`, `sections:write`, `quizzes:write`, `grades:write`, `discussions:write`) on top of the same service-layer checks. A role downgrade invalidates professor tokens. |


## HLAP-02 — Are access controls for staff within your organization based on structured rules, such as RBAC, ABAC, or PBAC?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Additional Information** | Vendor staff do not share a generic “god” application login. Production cloud consoles use unique named accounts with MFA. Application-level staff access, when needed for support, is via an `ADMIN` SOL user or least-privilege console access, not by impersonating students. Acceptable-use policy prohibits browsing student records without a job need. Quarterly review of admin and console access. |


## HLAP-03 — Do you have a documented and currently implemented strategy for securing employee workstations when they work remotely (i.e., not in a trusted computing environment)?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Additional Information** | Production is 100% cloud SaaS; there is no corporate data center LAN that holds education records. Strategy: unique MFA-backed console accounts; no production secrets on laptops in source control (env via Vercel); no shared passwords; disk encryption and screen lock expected on devices used for production consoles; production data is not copied to personal machines except institution-directed exports handled as restricted data. Small-team policy rather than MDM fleet for every contractor device. |


## HLAP-04 — Does the system provide data input validation and error messages?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Additional Information** | Mutating APIs validate JSON with Zod (field length caps, enums for question types, numeric ranges). Middleware enforces Content-Length / body byte caps (1 MB class) and JSON content-type. Error responses are standardized (no stack traces or secrets to the browser). Quiz authoring caps include title ≤ 200 chars, question text ≤ 4,000, options ≤ 12, etc. CSV bulk import rejects invalid types. |


## HLAP-05 — Are you using a web application firewall (WAF)?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Additional Information** | **Vercel Firewall is Active** on the production project (verified 11 August 2026). Bot Protection on Vercel Firewall was **Inactive** as of that date (enable before packet if the plan allows). Compensating: CSP, HSTS, frame deny, Upstash rate limits (required in production), Clerk attack protection on auth (lockout, device trust, Cloudflare Turnstile bot sign-up, user-enumeration protection — all Enabled as of 11 August 2026). |


## HLAP-06 — Do you have a process and implemented procedures for managing your software supply chain (e.g., libraries, repositories, frameworks, etc.)?


|                            |                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                        |
| **Additional Information** | Dependencies via npm lockfile. CI installs with `npm ci`. Cadence: Dependabot (or equivalent GitHub alerts) plus `npm audit` at least monthly; remediate critical/high within 30 days unless a compensating control is documented with owner and expiry. Re-audit after major upgrades. Secrets are not committed. No PHI/PCI in the app repo. |


---

# Authentication, Authorization, and Accounting

## HLAA-01 — Does your solution support single sign-on (SSO) protocols for user and administrator authentication?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (platform capability; campus IdP not yet federated)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Additional Information** | End-user authentication is **Clerk**. Application sessions are Clerk sessions consumed by Next.js middleware. Clerk supports **Enterprise SSO (SAML 2.0 and OIDC)** on eligible plans. **Campus IdP (e.g. FGCU) is not connected as of this date.** Until connected, users sign in with Clerk-hosted email / passwordless OTP as configured. After federation: IdP → Clerk Enterprise connection → existing SOL RBAC (no custom SAML SP in the app). MCP connectors use Clerk OAuth 2.1 + PKCE separately from campus SSO. Strong auth: Clerk lockout / bot / enumeration protections enabled (11 August 2026); MFA available in Clerk (production “required for ADMIN/PROFESSOR” policy screenshot still to be captured). |


## HLAA-02 — Does your organization participate in InCommon or another eduGAIN-affiliated trust federation?


|                            |                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **No**                                                                                                                                                       |
| **Additional Information** | SOL is not an InCommon participant. Campus federation is planned via Clerk Enterprise SSO to the institution’s IdP, not via InCommon metadata in SOL itself. |


## HLAA-03 — Does your application support integration with other authentication and authorization systems?


|                            |                                                                                                                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                            |
| **Additional Information** | Via Clerk: SAML 2.0, OIDC, and social/enterprise connections Clerk supports. No native on-prem Active Directory bind and no Kerberos. Authorization (roles, section membership) remains inside SOL after identity is established. Professor agents: OAuth 2.1 to the MCP resource. |


## HLAA-04 — Does your solution support any of the following Web SSO standards? [e.g., SAML2 (with redirect flow), OIDC, CAS, or other]


|                            |                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                         |
| **Additional Information** | **OIDC** is how the application talks to Clerk today. **SAML 2.0** is available through Clerk Enterprise SSO (redirect flow as configured in Clerk). **CAS** is not implemented natively. Information exchange: TLS; Clerk session cookies (HttpOnly, Secure, SameSite) for the web app; Bearer tokens for MCP. |


## HLAA-05 — Do you support differentiation between email address and user identifier?


|                            |                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                  |
| **Additional Information** | Stable application identifier is the SOL `users.id` (UUID). Authentication identifier is Clerk `clerkId`, stored separately from `email`. Email is used for account contact and campus matching; it is not the only key. |


## HLAA-06 — Do you allow the customer to specify attribute mappings for any needed information beyond a user identifier? (e.g., Reference eduPerson, ePPA/ePPN/ePE)


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (when campus SSO is configured)                                                                                                                                                                                                                                                                                                                                                                          |
| **Additional Information** | Clerk Enterprise SSO allows mapping IdP claims (email required; name; optional employee/student id) onto the Clerk user. SOL then uses email / Clerk id via the existing user-provisioning path. eduPerson / ePPN mappings are configured per institution at Clerk, not as a built-in eduPerson schema in the SOL database. Until campus SSO is live, only Clerk profile + SOL role/enrollment attributes apply. |


## HLAA-07 — Are audit logs available to the institution that include AT LEAST all of the following: login, logout, actions performed, timestamp, and source IP address?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (application actions: yes; login/logout: code complete, production webhook must be confirmed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Additional Information** | Append-only `audit_log` (database trigger rejects UPDATE/DELETE) stores actor user id, Clerk id, action, target type/id, JSON metadata, **source IP**, **user-agent**, **timestamp**. Institution admins browse this in the product Audit UI. Actions include enrollment, role/paid changes, gradebook view, attempt view, grade export, purge, FERPA disclosure recording, quiz attempt start/submit, MCP tool calls, professor token mint/revoke. Login/logout: Clerk `session.created` → `auth.session.create`; `session.ended` / `revoked` / `removed` → `auth.session.end`, via signed Clerk webhook with `clerk_events` idempotency. **Ops to confirm live:** webhook URL `https://<domain>/learning/api/clerk/webhook`, subscribed events, `CLERK_WEBHOOK_SIGNING_SECRET` in Vercel Production. Clerk Dashboard also retains session events as a second copy. Audit log retention: at least 1 year (prefer 3). |


## HLAA-08 — If you don't support SSO, does your application and/or user-frontend/portal support multi-factor authentication? (e.g., Duo, Google Authenticator, OTP, etc.)


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Additional Information** | SSO is supported at the platform layer (HLAA-01). Independently, Clerk supports MFA (TOTP and other factors Clerk offers) and passwordless OTP. Target policy: MFA required for `ADMIN`; required or strongly encouraged for `PROFESSOR`; student MFA per institution preference. **Production MFA-required screenshots were not yet recorded as of 12 August 2026** — capture before packet submission. Clerk lockout policy is Enabled. |


## HLAA-09 — Does your application automatically lock the session or log-out an account after a period of inactivity?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **Yes** (configurable in Clerk)                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Additional Information** | Session lifetime and inactivity timeout are Clerk Production Dashboard settings. Recommended targets for higher-ed: session lifetime ≤ 7 days; inactivity timeout ≤ 60 minutes (prefer 30 for faculty on shared machines). **Actual Dashboard values must be screenshot for the packet** (not yet recorded as of 12 August 2026). Password-reset link expiry and revoke-other-sessions-on-password-change should be confirmed in the same screenshots. |


---

# Systems Management

## HLSY-01 — Do you have a systems management and configuration strategy that encompasses servers, appliances, cloud services, applications, and mobile devices (company and employee owned)?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Additional Information** | No customer-managed servers or appliances. Compute is Vercel serverless; data is Neon; auth is Clerk. Configuration as code for the application; environment secrets in Vercel Production only. Preview deployments: Deployment Protection required so staging education data is not world-readable; Preview uses separate Clerk + Neon. No SOL native mobile app (responsive web). Company devices used for consoles: unique MFA accounts; no production data in unapproved tools. |


## HLSY-02 — Will the institution be notified of major changes to your environment that could impact the institution's security posture?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Additional Information** | Material subprocessor changes that expand education-record processing are communicated with reasonable notice under the FERPA rider. Security-impacting product changes follow change management (PR/CI). Institution contacts named on the agreement are the notification path. SOL does not silently add AI training on customer content; ZDR/no-train drift is treated as a potential unauthorized redisclosure. |


## HLSY-03 — Are your systems and applications scanned for vulnerabilities [that are then remediated] prior to new releases?


|                            |                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (dependency and CI; no dedicated DAST claimed)                                                                                                                                                                                                                                                                |
| **Additional Information** | `npm audit` / GitHub dependency alerts; CI typecheck and tests before merge to `main`. Sentry in production for runtime errors. **No third-party DAST/SAST platform (e.g. Qualys, Burp Enterprise) is claimed.** Vercel Firewall provides edge filtering. Critical/high dependency issues: 30-day remediation target. |


## HLSY-04 — Have your systems and applications had a third-party security assessment completed in the past year?


|                            |                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                                                                 |
| **Additional Information** | No third-party penetration test report is attached. Internal Type I–style control walkthrough: 9 August 2026. Hosting providers’ SOC 2 reports cover their platforms, not a dedicated assessment of the SOL application. Commission an independent pen test if the institution requires one as a condition of go-live. |


## HLSY-05 — Do you have policy and procedure, currently implemented, guiding how security risks are mitigated until patches can be applied?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Additional Information** | Critical/high vulnerabilities: remediate within 30 days or document compensating control, owner, and expiry. Compensating examples: WAF rules, disable a feature flag (payments off), rotate keys, block a dependency, increase rate limits, revoke sessions. SEV1 secret leak: rotate immediately, redeploy, review provider logs, notify institution if education records may have left authorized subprocessors. |


---

# Data

## HLDA-01 — Does the environment provide for dedicated single-tenant capabilities? If not, describe how your product or environment separates data from different customers.


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No** (not single-tenant DBs). Logical multi-tenancy.                                                                                                                                                                                                                                                                                                                                                                       |
| **Additional Information** | One shared Postgres (single production deployment). Isolation is **authentication + RBAC + section enrollment**, not per-institution schemas or dedicated clusters. Automated tests cover authorization on education-record paths. Acceptable for a **single-institution pilot**. If multiple schools share one database, `institutionId` scoping is required before that expansion; it is not claimed as implemented today. |


## Education-record inventory (stands in for a separate data map)


| Store                    | Contents                                            | Classification                  | Who can access                           |
| ------------------------ | --------------------------------------------------- | ------------------------------- | ---------------------------------------- |
| `users`                  | clerkId, email, names, role, paid, stripeCustomerId | Account / education             | Self; ADMIN manage                       |
| `student_sections`       | studentId, sectionId, status                        | Education record                | Student; section faculty; ADMIN          |
| `professor_sections`     | professorId, sectionId                              | Operational                     | Professor; ADMIN                         |
| `courses`, `sections`    | Catalog, enrollment codes                           | Operational (codes are secrets) | Role-gated                               |
| `quizzes`, `questions`   | Stems, keys, rubrics                                | Assessment                      | Author + ADMIN; students get stems only  |
| `attempts`               | answers JSON, score, gptFeedback, status            | Education record                | Owner student; section faculty; ADMIN    |
| Discussions              | prompts + transcripts                               | Education record                | Assigned students; author faculty; ADMIN |
| `grading_cache`          | Hash + cached model payload                         | Derived                         | System                                   |
| `audit_log`              | Actor, action, target, IP, UA                       | Security / disclosure log       | ADMIN read                               |
| `professor_api_tokens`   | Token hash, prefix, scopes (no plaintext)           | Credential                      | Owner professor                          |
| Stripe / `stripe_events` | Payment metadata                                    | Financial                       | System / ADMIN ops                       |


Default classification: **education record**, not directory information, for LMS academic data.

## HLDA-02 — Is sensitive data encrypted, using secure protocols/algorithms, in transport? (e.g., system-to-client)


|                            |                                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                  |
| **Additional Information** | HTTPS/TLS at the Vercel edge. HSTS: `max-age=63072000; includeSubDomains; preload`. No non-TLS application URL is offered. Database connections use Neon TLS connection strings. Clerk, Stripe, OpenAI, Upstash, Sentry calls are HTTPS. |


## HLDA-03 — Is sensitive data encrypted, using secure protocols/algorithms, in storage? (e.g., disk encryption, at-rest, files, and within a running database)


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Additional Information** | Neon Postgres encryption at rest (provider-managed), on AWS volumes in `aws-us-east-1`. AWS encrypts EBS/disk at rest (AES-256) as part of its standard offering; Neon additionally manages database-layer encryption and key handling for the service. Faculty CSV exports are delivered over authenticated HTTPS; they are **not** password-encrypted files on the faculty laptop — the UI requires a FERPA handling acknowledgment and warns that institutional restricted-data rules apply. Application secrets live in Vercel env, not in the repo. Professor PATs: SHA-256 hash only. |


## HLDA-04 — Are involatile backup copies made according to predefined schedules and securely stored and protected?


|                            |                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                         |
| **Additional Information** | Neon point-in-time recovery / snapshots, stored by Neon on AWS in the same project region (`aws-us-east-1`), encrypted at rest. Production PITR window is **24 hours** as of 22 August 2026. Application tier has no local disk of record. Stripe/Clerk retain their own vendor backups of payment/auth data under their terms. |


## HLDA-05 — Can the institution extract a full or partial backup of data?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Additional Information** | In-product: authenticated faculty CSV grade exports (HTTPS; FERPA acknowledgment). Institution-directed: admin can export/assist with access, amendment, or deletion; purge within **10 business days** of a verified written institutional request (or sooner if the contract requires). Full database dump of only one institution’s rows is an operator-assisted extract (SQL against scoped tables), not a self-serve “download my tenant” button, because tenancy is logical rather than a dedicated schema. |


## HLDA-06 — Do you have a media handling process that is documented and currently implemented that meets established business needs and regulatory requirements, including end-of-life, repurposing, and data sanitization procedures?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (cloud-media; no customer tapes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Additional Information** | SOL does not handle institution-owned backup tapes or USB media. Sanitization of education records in product: **soft-delete** then **admin hard purge** (audited `*.purge`). Default retention: active term + **3 years** unless the contract overrides. Soft-deleted rows remain until purge or retention expiry. `audit_log` is not deleted via the app UI. Neon PITR copies expire with the provider window. End of contract: delete or return production education records per rider; residual backups expire automatically. Faculty-downloaded CSVs are the institution’s media once they leave SOL. |


## HLDA-07 — Does your staff (or third party) have access to institutional data (e.g., financial, PHI or other sensitive information) within the application/system?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Additional Information** | SOL staff may access education records only for assigned support, security, or operations duties (acceptable use). Third parties that **process** data: see HLTP-01. OpenAI receives minimized answer/transcript text (not names/emails/IDs in prompts). Clerk holds email, name, auth identifiers. Neon holds the full database. Vercel sees request metadata/logs. Sentry: stack traces, default PII off in production. Upstash: opaque rate-limit keys. Stripe (if paywall on): email, customer id, payment metadata — not quiz answers. No PHI by design. |


---

# Datacenter

## HLDC-01 — Does your company manage the physical data center where the institution's data will reside?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Additional Information** | SOL does not operate data centers. Application compute is **Vercel** (typically AWS for US production). The database is **Neon serverless Postgres running on Amazon Web Services** — physical servers, disks, and facilities are **AWS** in **US East (N. Virginia), region** `aws-us-east-1`. Neon is the database operator (control plane, Postgres engine, branching/PITR); AWS is the underlying IaaS. SOL has no customer-accessible cages or racks. |


## HLDC-02 — Are you generally able to accommodate storing each institution's data within their geographic region?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (US target; confirm consoles)                                                                                                                                                                                                                                                                                                                                                                            |
| **Additional Information** | Education records at rest are in the **United States**: Neon production project region `aws-us-east-1` **(N. Virginia)**. Confirm the Vercel project region in the Vercel console (US production is typically also AWS). SOL does not currently offer a customer-selectable EU Neon region as a product SKU. Subprocessors (e.g. OpenAI inference) may process minimized text in regions those vendors document. |


## HLDC-03 — Does the hosting provider have a SOC 2 Type 2 report available?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Additional Information** | **Yes for the physical host and the database operator.** AWS publishes SOC 2 Type 2 (and ISO 27001, PCI DSS, etc.) covering the data centers where Neon runs. Neon publishes its own SOC 2 Type 2 for the managed Postgres service. Vercel publishes SOC 2 Type 2 for the application platform. Clerk, Stripe, OpenAI, Upstash, and Sentry likewise publish enterprise trust documentation. SOL itself does **not** have a SOC 2 report (DOCU-01). |


## HLDC-04 — Does your organization have physical security controls and policies in place?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (provider + office hygiene)                                                                                                                                                                                                                                                                                                                                                                   |
| **Additional Information** | Physical security of education-record disks and cages is **AWS data-center controls** (badges, cameras, two-factor physical access, as described in AWS’s SOC 2 / physical security whitepapers). Neon and Vercel inherit those facilities. SOL office/device hygiene: escort guests, lock screens, no printed rosters as a practice, MFA on consoles. SOL does not operate a data center of its own. |


## HLDC-05 — Do you have physical access control and video surveillance to prevent/detect unauthorized access to your data center?


|                            |                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **N/A** (no SOL-owned DC) / **Yes** via hosting providers                                                                                                                                                                                                                                       |
| **Additional Information** | Unauthorized physical access to disks holding Postgres is controlled by **AWS** at the `us-east-1` facilities (access control, video surveillance, as documented in AWS compliance packages). Neon operates the database service on those servers; SOL employees cannot enter AWS data centers. |


---

# Networking

## HLNT-01 — Do you enforce network segmentation between trusted and untrusted networks (i.e., Internet, DMZ, Extranet, etc.)?


|                            |                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                      |
| **Additional Information** | Public Internet reaches only the Vercel HTTPS edge. Application functions run in Vercel’s isolated serverless environment. Neon is not exposed as a public application port; the app connects with authenticated TLS connection strings. Redis (Upstash) is API-authenticated. No institution Extranet/VPN. Preview is separately protected. |


## HLNT-02 — Are you utilizing a stateful packet inspection (SPI) firewall?


|                            |                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                               |
| **Additional Information** | Vercel edge / Firewall plus cloud-provider network controls in front of compute and database. SOL does not run a customer-managed appliance firewall. |


## HLNT-03 — Do you use an automated IDS/IPS system to monitor for intrusions?


|                            |                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **Yes** (cloud-native / WAF / monitoring; not a dedicated IDS appliance)                                                                                                             |
| **Additional Information** | Vercel Firewall (active), Vercel logs, Sentry alerting, Clerk attack protection (credential stuffing / bot / lockout), Upstash rate-limit 429s. No on-prem Snort/Suricata appliance. |


## HLNT-04 — Are you employing any next-generation persistent threat (NGPT) monitoring?


|                            |                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                |
| **Additional Information** | No dedicated NGPT / APT hunting platform is deployed. Detection is WAF + logs + Sentry + Clerk + provider telemetry. No commitment date for a dedicated NGPT product. |


## HLNT-05 — Do you require connectivity to the institution's network for support/administration or access into any existing systems for integration purposes?


|                            |                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                     |
| **Additional Information** | Pure SaaS over the public Internet. No VPN, no on-prem agent, no SIS/LMS LTI required for the core product. Campus SSO, if enabled, is outbound IdP federation through Clerk, not a hole into the campus network from SOL. |


---

# Incident Handling

## HLIH-01 — Do you have a formal incident response plan?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Additional Information** | Severity: **SEV1** confirmed unauthorized access to education records or production secrets leaked; **SEV2** suspected breach, widespread grading-integrity outage, or subprocessor retention misconfiguration; **SEV3** isolated bugs without record exposure. Steps: Detect (Sentry, Vercel, Neon, Stripe, user report) → Contain (rotate keys, revoke Clerk sessions, disable integration, purge if warranted) → Eradicate/recover (patch, redeploy, Neon PITR) → Notify institutional contacts per FERPA rider → Postmortem. Tabletop at least annually. A solo tabletop (scenario: leaked `OPENAI_API_KEY`) was completed 12 August 2026; gaps: single on-call person; configure OpenAI spend/anomaly alerts; add secondary IR contact on the rider. |


## HLIH-02 — Do you have an incident response process and reporting in place to investigate any potential incidents and report actual incidents?


|                            |                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                  |
| **Additional Information** | Same plan as HLIH-01. Confirmed breach of institution education records: notify the Institution **without undue delay** and cooperate on investigation and required notices (FERPA rider). OpenAI ZDR/training drift is treated as potential unauthorized redisclosure. Institution-facing disclosure recording exists in-product for admin (`ferpa.disclosure.record`). |


## HLIH-03 — Do you carry cyber-risk insurance to protect against unforeseen service outages, data that is lost or stolen, and security incidents?


|                            |                                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                               |
| **Additional Information** | No cyber-risk insurance policy is claimed in this response. Do not list a carrier or limits until a policy is bound. If a policy is purchased, update this answer with carrier, limits, and whether education-record/privacy incidents are in scope. |


## HLIH-04 — Do you have either an internal incident response team or retain an external team?


|                            |                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (internal; small)                                                                                                                                                     |
| **Additional Information** | Internal: founder / engineering lead. No retained MSSP / DFIR retainer is claimed. Cloud providers handle their platform incidents. Secondary on-call contact is a known gap. |


## HLIH-05 — Do you have the capability to respond to incidents on a 24 x 7 x 365 basis?


|                            |                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vendor Answer**          | **No**                                                                                                                                                                                                                                     |
| **Additional Information** | Best-effort response, not a staffed 24×7 SOC. Sentry/Vercel can alert asynchronously. Plan: add a secondary contact and, if institutional contracts require 24×7, either on-call rotation or a retained IR vendor — not implemented today. |


---

# Policies, Procedures, and Processes

## HLPP-01 — Can you share the organization chart, mission statement, and policies for your information security unit?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (small-org equivalent; restated here)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Additional Information** | **Org:** Founder / engineering lead owns information security. No separate security unit. **Mission:** Protect education records and operational data through RBAC, encrypted transport, provider encryption at rest, audit logging, rate limiting, and monitored production systems (Vercel, Neon, Clerk, Sentry). **Review:** annual or after material architecture change. Written policies in force (summaries inlined in this HECVAT): information security, access control, acceptable use, secure development, change management, vulnerability management, incident response, business continuity / DR, data retention, vendor management, FERPA education-record handling. |


## HLPP-02 — Are information security principles designed into the product lifecycle?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Additional Information** | Authz checks on every page/API that reads education records. Zod validation on mutations. Secrets not in client bundles except `NEXT_PUBLIC_`* publishable values. AI prompts must not include student profile fields; minimization helper is mandatory on grading/chat paths. Chatbots never receive answer keys. Tests: Vitest unit + integration against a Neon test branch when data paths change. CSRF origin allowlist on cookie mutations; Bearer/MCP/webhooks/cron exempt with their own auth. Stripe and Clerk webhooks are signature-verified and idempotent. |


## HLPP-03 — Do you have a documented information security policy?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Additional Information** | Policy statement: SOL protects education records and operational data through role-based access, encrypted transport, provider encryption at rest, audit logging, rate limiting, and monitored production systems (Vercel, Neon, Clerk, Sentry). Owner: engineering lead. Supporting procedures are the access-control, IR, vulnerability, change, BCP, retention, vendor, FERPA, and secure-development practices described in this document. |


---

# Third Party Assessment

## HLTP-01 — Will institutional data be shared with or hosted by any third parties? (e.g., any entity not wholly owned by your company is considered a third party)


|                            |                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                           |
| **Additional Information** | Subprocessors that may process SOL/institution data, including education records: |



| Vendor                    | Purpose                                           | Data typically processed                                | Notes                                                    |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Clerk                     | Authentication                                    | Email, name, auth identifiers                           | Production instance only                                 |
| Neon                      | Primary database (managed Postgres)               | All education records                                   | Encrypted at rest; PITR; **runs on AWS** `aws-us-east-1` |
| Amazon Web Services (AWS) | IaaS under Neon (and typically Vercel US compute) | Education records at rest on AWS volumes in N. Virginia | Fourth-party / infrastructure for Neon; AWS SOC 2 Type 2 |
| Vercel                    | Hosting / serverless                              | Request data, logs                                      | Preview protection required; typically AWS for US        |
| OpenAI                    | Grading + discussion AI                           | Minimized answer/transcript text                        | ZDR / no-train required in prod org                      |
| Stripe                    | Payments (if enabled)                             | Email, customer id, payment metadata                    | Live keys only if paywall on                             |
| Upstash                   | Rate limiting                                     | Opaque rate-limit keys (user/IP ids)                    | Required in production                                   |
| Sentry                    | Error monitoring                                  | Stack traces; default PII off in prod                   | Scrubbing on                                             |
| Braintrust                | LLM/agent observability + evals                   | Minimized answer/transcript traces; MCP tool metadata   | DPA + retention before prod; see AI_EDUCATION_RECORDS.md |


Professor-chosen AI **clients** (Cursor, Claude.ai, ChatGPT connectors) that a faculty member connects via MCP are **not SOL subprocessors**; they receive whatever the professor’s credential is authorized to read. Institutions should restrict Agent Access to approved tools.

## HLTP-02 — Do you perform security assessments of third-party companies with which you share data?


|                            |                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes** (review, not a full annual pen test of each vendor)                                                                                                                                                                                                                                                                                                                                                                  |
| **Additional Information** | Before adding a vendor that touches education records: security review, DPA/FERPA terms, least-privilege config, update the subprocessor list. Annually confirm OpenAI ZDR/no-train, Braintrust retention/no-train, Neon encryption/backup and AWS region, Clerk production instance, and Sentry PII settings. Hosting SOC 2 Type 2 reports are used as evidence for AWS, Neon, and Vercel. SOL does not independently pentest Clerk, OpenAI, Neon, or AWS. |


## HLTP-03 — Do you have an implemented third-party management strategy?


|                            |                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **Yes**                                                                                                                                                                                                                                                    |
| **Additional Information** | Maintain the subprocessor table; FERPA rider covers school-official subprocessors and notice of material expansion; Redisclosure only to listed subprocessors, as required by law, or with Institution direction. No advertising use of education records. |


## HLTP-04 — Do you have a process and implemented procedures for managing your hardware supply chain? (e.g., telecommunications equipment, export licensing, computing devices)


|                            |                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vendor Answer**          | **N/A** (SaaS; no hardware product)                                                                                                                                                                                                                                                                         |
| **Additional Information** | SOL does not sell or install telecommunications or computing hardware at the institution. Employee/contractor devices used to administer production follow unique MFA accounts, no shared passwords, and offboarding within one business day. Export-control hardware supply chain is not in product scope. |


---

# Privacy, FERPA, and AI addendum

HECVAT 4 folded Lite/Full/On-Prem into one workbook and expanded Privacy and AI. U.S. public institutions assessing SOL should treat the following as part of this packet even when they still score Lite 3.06.

## Privacy / FERPA


| Topic                                      | Answer                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FERPA in scope?                            | **Yes.** Rosters, enrollments, attempts, grades, AI rationale, discussion transcripts, related audit events.                                                                                                       |
| School official?                           | **Yes**, under written institutional agreement / FERPA rider. Institution remains the FERPA educational agency for student/parent rights.                                                                          |
| Purpose limitation                         | Services, security, and contracted improvement only. **No advertising** use of education records.                                                                                                                  |
| Redisclosure                               | Listed subprocessors, law, or Institution direction only.                                                                                                                                                          |
| Student/parent access, amendment, deletion | Exercised **through the institution**. SOL executes with admin tools (including soft-delete/purge) within a commercially reasonable time; documented SLA **10 business days** for verified written purge requests. |
| Breach notice                              | Without undue delay after confirming a breach of that institution’s education records in SOL’s possession.                                                                                                         |
| Directory information                      | Academic LMS data is **not** treated as directory information by default.                                                                                                                                          |
| Email of grades/rosters                    | **No.** Auth mail is Clerk (sign-in/verification) and does not include grade content.                                                                                                                              |
| Children COPPA                             | Designed for higher-ed / adult learners. **Not directed at children under 13.**                                                                                                                                    |
| GDPR                                       | Not a claimed GDPR Article 42 certification. U.S. hosting target. If EU personal data is in scope, execute a DPA and confirm regions — not the default offering.                                                   |
| State student-privacy laws                 | Honor contract + FERPA rider; customize with counsel (e.g. Florida) before signature.                                                                                                                              |
| Data residency                             | **Yes — US.** Neon production: AWS `aws-us-east-1` (N. Virginia). Confirm Vercel project region (typically AWS US).                                                                                                |
| Tenancy                                    | Shared DB; logical isolation.                                                                                                                                                                                      |


## Artificial intelligence


| Topic                                                 | Answer                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does the product use AI/ML on institutional data?     | **Yes.** (1) Short-answer grading. (2) Socratic discussion chatbots.                                                                                                                                                                                                                    |
| Training on institution data?                         | **Must be No** in production: OpenAI org with training on customer content **disabled**. Operator must screenshot this.                                                                                                                                                                 |
| Retention of prompts/completions at the model vendor? | **Zero Data Retention / strongest no-retention** required for models used in grading and chat. Operator must screenshot. Consumer ChatGPT accounts are **not** allowed for production keys.                                                                                             |
| What is sent?                                         | Minimized student-generated text (answers, messages), question stems, reference answers, rubrics. **Not** student name, email, or Clerk IDs. Email-shaped strings redacted.                                                                                                             |
| Is the model the grade of record?                     | **No.** Scores are computed in TypeScript from rubric matches; model output is not trusted as a raw numeric grade. Deterministic fallback if OpenAI is down. Faculty remain responsible for academic judgments. Stored `gptFeedback` is part of the education record and is role-gated. |
| Chatbot leakage of keys?                              | Answer keys and attempt feedback are **not** injected into student chatbot context; replies are scrubbed.                                                                                                                                                                               |
| Human review                                          | Faculty can view attempts, rationale, regrade.                                                                                                                                                                                                                                          |
| Professor MCP / external agents                       | Optional. Same authz as the dashboard. Audited. Institution AI-tooling policy governs what faculty paste into their own agents.                                                                                                                                                         |
| Image/biometrics/proctoring AI                        | **Not used.**                                                                                                                                                                                                                                                                           |
| Incident                                              | ZDR/training misconfiguration = potential unauthorized redisclosure → IR + institution notice.                                                                                                                                                                                          |


---

# Security headers and application controls (technical detail)

Applied to `/:path*` on the Next.js application:


| Header                    | Value                                                                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload`                                                                                                                                                                                                                              |
| X-Content-Type-Options    | `nosniff`                                                                                                                                                                                                                                                                   |
| Referrer-Policy           | `strict-origin-when-cross-origin`                                                                                                                                                                                                                                           |
| Permissions-Policy        | `camera=(), microphone=(), geolocation=(), payment=(self)`                                                                                                                                                                                                                  |
| X-Frame-Options           | `DENY`                                                                                                                                                                                                                                                                      |
| Content-Security-Policy   | `default-src 'self'`; `frame-ancestors 'none'`; `object-src 'none'`; `form-action 'self'`; scripts/connect/frame allowlists for Clerk (including `https://clerk.strat-ops.net`), Stripe, Sentry, Cloudflare Turnstile, Upstash, Neon. Production CSP drops `'unsafe-eval'`. |


Other application controls: same-origin Origin/Referer check on cookie-authenticated POST/PUT/PATCH/DELETE to `/api/*`; JSON body size limits; Upstash sliding-window rate limits (MCP 120 req/min per user); cron routes require `CRON_SECRET` bearer; production boot fails closed without `OPENAI_API_KEY`, `CRON_SECRET`, Clerk webhook secret, and Upstash.

---

# Honest “No” / partial list (do not delete when copying to Excel)

Use this as a cover note for the assessor.


| Item                                                      | Status                                                 |
| --------------------------------------------------------- | ------------------------------------------------------ |
| SOC 2 Type I / Type II (SOL)                              | **No**                                                 |
| CSA CAIQ / STAR                                           | **No**                                                 |
| ISO 27001 / FedRAMP / NIST 800-171 / CMMC                 | **No**                                                 |
| Third-party penetration test                              | **No**                                                 |
| Third-party VPAT                                          | **No** (self-ACR only)                                 |
| Dedicated CISO / security team                            | **No**                                                 |
| Cyber insurance                                           | **No**                                                 |
| InCommon / eduGAIN                                        | **No**                                                 |
| 24×7×365 IR                                               | **No**                                                 |
| Single-tenant / per-institution database                  | **No**                                                 |
| Keyboard operability of **all** functions verified        | **No**                                                 |
| NGPT monitoring product                                   | **No**                                                 |
| PHI / card data in SOL                                    | **No** (by design)                                     |
| Campus SAML connected to the institution IdP              | **Not yet** (Clerk Enterprise plan exists)             |
| Neon `sol_app` least-privilege role applied in production | **Partial** (script ready; operator confirm)           |
| Clerk session webhook live in production                  | **Partial** (code shipped; Dashboard + secret confirm) |
| Clerk MFA-required + session timeout screenshots          | **Capture before send**                                |
| OpenAI ZDR / no-train console verification                | **Capture before send**                                |
| Live Neon restore-fork drill                              | **Pending** (procedure documented)                     |
| Vercel Firewall Bot Protection                            | **Inactive** as of 11 August 2026                      |
| Encrypted-at-rest CSV on faculty laptops                  | **No** (policy + UI warning)                           |


---

# Packet checklist (operator)

Complete before emailing this to an institution (e.g. FGCU):

1. Copy every Vendor Answer into the official HECVAT Lite 3.06 (or HECVAT 4) workbook; do not send markdown alone if they required Excel.
2. Fill GNRL-06–13 with real names, email, phone.
3. Neon production region is **AWS** `aws-us-east-1` (screenshot the Neon project region page). Confirm and screenshot the Vercel project region.
4. Attach Privacy Policy and Terms URLs (already public).
5. Screenshot: Vercel Firewall Active; Clerk attack protection (lockout, device trust, Turnstile, enumeration — captured 11 August 2026); Clerk session lifetime + inactivity + MFA policy; Clerk webhook + sample `auth.session.*` audit row; OpenAI org data-controls / ZDR; Neon PITR (24 hours as of this date).
6. Counsel-reviewed FERPA rider with named breach contacts and notification SLA.
7. Do not answer Yes to SOC 2, pen test, third-party VPAT, cyber insurance, or 24×7 IR unless those facts change.
8. If the institution uses HECVAT 4, paste the Privacy/FERPA and AI addendum into the matching workbook sections.

**Preparer:** Founder / Engineering Lead, Strategic Operations LLC (SOL Learning)  
**Date:** 22 August 2026  
**Sign-off:** ______________________________ (date: ________)