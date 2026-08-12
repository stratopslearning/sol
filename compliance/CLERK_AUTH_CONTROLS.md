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

**Application audit log (`audit_log`):** sensitive resource actions with IP + user-agent (`lib/audit.ts`).

**Clerk Dashboard:** retains login / logout / session events.

**Optional enhancement (recommended before broad rollout):**

1. Add Clerk webhook endpoint for `session.created`, `session.ended`, `user.signed_out`.
2. Verify Svix signature; map Clerk user → SOL `users.id`.
3. Write `auth.session.create` / `auth.session.end` rows via `logAudit`.

Until webhooks ship, HECVAT answer: “Auth events retained in Clerk; application logs education-record access and privileged mutations with IP.”

---

## 6. Packet attachment checklist

- [ ] Session lifetime screenshot
- [ ] Inactivity timeout screenshot
- [x] Attack protection / lockout screenshot (2026-08-11 — lockout, device trust, bot sign-up, user enumeration all Enabled)
- [ ] MFA policy screenshot
- [ ] (When ready) Enterprise SSO connection screenshot for FGCU

**Operator sign-off:** __________________ (date: ________)
