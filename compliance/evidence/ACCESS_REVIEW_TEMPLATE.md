# Access review template

**Period:** 2026 Q3  
**Reviewer:** Founder / engineering lead  
**Date:** 2026-08-12  

## App ADMIN users

| user id | email | still needed? | action |
| --- | --- | --- | --- |
| _(export from prod)_ | _(export)_ | Y/N | keep / demote / disable |

**How to export:** In production Neon, query `users` where `role = 'ADMIN'` (id, email, name, created_at). Paste rows above and mark actions.

**Status this period:** Dry-run procedure documented. Live ADMIN roster review **pending** first production export before FGCU submission.

## Cloud consoles

| System | Accounts reviewed | Removals |
| --- | --- | --- |
| Vercel | Confirm only active operators; MFA/SSO on | |
| Neon | Confirm only active operators; MFA/SSO on | |
| Clerk | Confirm only active operators; MFA/SSO on | |
| OpenAI | Confirm only active operators; MFA/SSO on | |
| Stripe | Confirm only if paywall enabled | |
| Sentry | Confirm only active operators | |
| Upstash | Confirm only active operators | |
| GitHub | Confirm write access to `sol` repo limited | |

**Cadence:** Quarterly per [`../policies/ACCESS_CONTROL.md`](../policies/ACCESS_CONTROL.md).

**Sign-off:** __________________ (date: ________)
