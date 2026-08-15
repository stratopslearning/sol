# Clerk authentication controls (HECVAT Auth)

Configure these in the **Clerk Production** instance Dashboard. Attach screenshots to the FGCU packet.

**Target date:** before institutional security submission  
**Instance:** Production only (never copy prod settings blindly into Preview without a separate instance)

---

## 1. Session lifetime

**Recommended targets (FGCU-friendly):**

| Setting | Target | Notes |
| --- | --- | --- |
| Session lifetime | ≤ 7 days | Absolute max session age |
| Inactivity timeout | ≤ 60 minutes (prefer 30 for faculty on shared machines) | Auto sign-out when idle |
| Multi-session | Device-scoped as product UX already describes | Document actual Dashboard value |

**Screenshot:** Clerk → Sessions / User & Authentication → Session lifetime settings.

**Also confirm:** password-reset link expiry and “revoke other sessions on password change” (Clerk defaults) — screenshot for the packet.

**Status:** Not yet recorded — capture Sessions settings next.

---

## 2. Lockout / brute-force / attack protection

**Verified 2026-08-11** in Clerk → User & authentication (Attack protection / related rules):

| Rule | Status |
| --- | --- |
| Lockout policy | Enabled |
| Device Trust (recommended) | Enabled |
| Bot sign-up protection (Cloudflare Turnstile) | Enabled |
| User enumeration protection | Enabled |

Keep a copy of this Dashboard screenshot in the FGCU packet (filename example: `clerk-attack-protection-2026-08-11.png`).

---

## 3. MFA

| Audience | Target |
| --- | --- |
| ADMIN users | MFA required |
| PROFESSOR users (FGCU) | MFA required or strongly encouraged via Clerk organization / instance policy |
| STUDENT users | Follow institution preference; optional MFA available |

**Screenshot:** MFA factors enabled (TOTP / SMS as offered) and any “required” org policy.

**Status:** Not yet recorded — configure and screenshot MFA next.

---

## 4. Campus SSO (SAML / OIDC)

- End-user auth today: Clerk-hosted email/OTP (OIDC-capable platform).
- FGCU campus IdP: follow [`SSO_FGCU_PLAN.md`](./SSO_FGCU_PLAN.md) (Clerk Enterprise SSO).
- Until connected, HECVAT answer: “OIDC via Clerk; SAML via Clerk Enterprise — not yet federated to FGCU IdP.”

---

## 5. Auth event auditing

**Application audit log (`audit_log`):** sensitive resource actions with IP + user-agent (`lib/audit.ts`), plus Clerk session lifecycle via webhook:

| Clerk event | Audit action |
| --- | --- |
| `session.created` | `auth.session.create` |
| `session.ended` / `session.revoked` / `session.removed` | `auth.session.end` |

**Implementation:** [`app/api/clerk/webhook/route.ts`](../app/api/clerk/webhook/route.ts) — Svix signature verify, `clerk_events` idempotency, map Clerk user → SOL `users.id`.

**Ops to go live:**

1. Clerk Dashboard → Webhooks → Add endpoint  
   `https://<domain>/learning/api/clerk/webhook`
2. Subscribe to `session.created`, `session.ended`, `session.revoked`, `session.removed`
3. Paste signing secret into Vercel as `CLERK_WEBHOOK_SIGNING_SECRET` (required in production)
4. Apply migration `drizzle/0012_clerk_events.sql`
5. Sign in once and confirm `audit_log` + `clerk_events` rows

**Status:** Code shipped; endpoint live status = **partial** until Dashboard wiring + secret are confirmed in production.

**Clerk Dashboard** also retains login / logout / session events as a second copy.

---

## 6. Packet attachment checklist

- [ ] Session lifetime screenshot
- [ ] Inactivity timeout screenshot
- [ ] Reset-link expiry / revoke-other-sessions screenshot
- [x] Attack protection / lockout screenshot (2026-08-11 — lockout, device trust, bot sign-up, user enumeration all Enabled)
- [ ] MFA policy screenshot
- [ ] Clerk webhook endpoint configured + sample `auth.session.*` audit row
- [ ] (When ready) Enterprise SSO connection screenshot for FGCU

**Operator sign-off:** __________________ (date: ________)
