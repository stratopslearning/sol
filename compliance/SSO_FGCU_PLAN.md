# FGCU campus SSO plan (Clerk Enterprise)

Goal: let FGCU faculty and students sign in with the campus IdP (SAML 2.0 or OIDC) instead of (or in addition to) email OTP.

## Current state

- Authentication: **Clerk** (email / passwordless OTP as configured).
- Platform capability: Clerk supports **Enterprise SSO** (SAML / OIDC) on eligible plans.
- App code: no custom SAML SP — federation is configured in Clerk and consumes standard Clerk sessions (`middleware.ts`, `lib/auth.ts`).
- MCP connectors use Clerk OAuth separately; campus SSO is for human users.

## Target architecture

```
FGCU IdP (SAML or OIDC)
        │
        ▼
Clerk Enterprise SSO connection (Production instance)
        │
        ▼
SOL session (existing requireAuth / RBAC)
```

## Implementation steps

1. **Confirm Clerk plan** includes Enterprise SSO / SAML.
2. **Collect FGCU IdP metadata** from FGCU IAM:
   - Entity ID / metadata URL (SAML) or discovery URL (OIDC)
   - Attribute mapping: email (required), name, optionally employee/student id
   - Whether IdP-initiated SSO is required
3. **Create SSO connection** in Clerk Production → SSO / Enterprise Connections.
4. **Map claims** so Clerk `email` matches the SOL `users.email` used today.
5. **Restrict** connection to `@fgcu.edu` (and any FGCU-approved domains).
6. **Test** with FGCU IT on a pilot professor + student account:
   - First login creates/links SOL user via existing `getOrCreateUser` path
   - Role still assigned by SOL admin (student default → professor promotion)
7. **Document** screenshots for HECVAT Auth section.
8. **Optional:** disable password auth for FGCU domains once SSO is stable.

## HECVAT answer (until live)

> OIDC via Clerk for application sessions. SAML 2.0 / OIDC campus federation is available through Clerk Enterprise SSO and is planned for FGCU IdP integration; not yet connected.

## HECVAT answer (after live)

> Yes — SAML/OIDC via Clerk Enterprise SSO federated to FGCU IdP. Application authorization remains RBAC inside SOL.

## Dependencies / risks

- FGCU must approve the service provider and release attributes.
- Email must be stable and unique; aliases can create duplicate SOL users if not mapped carefully.
- MFA may be enforced at IdP and/or Clerk — prefer IdP MFA for campus accounts.

## Status

- [ ] Clerk Enterprise SSO entitlement confirmed
- [ ] FGCU IdP metadata received
- [ ] Connection configured in Clerk Production
- [ ] Pilot users tested
- [ ] HECVAT screenshots attached

**Owner:** Founder / engineering lead + FGCU IAM contact  
**Last updated:** 2026-08-12
