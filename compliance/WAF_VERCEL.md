# Vercel Firewall / WAF enablement

HECVAT Application Security often asks whether a WAF protects the application. SOL is hosted on Vercel; enable **Vercel Firewall** (WAF) on the production project.

## Current status (verified 2026-08-11)

Project: **sol** (team `stratops-projects`) → Firewall → Traffic

| Item | Status |
| --- | --- |
| Firewall | **Active** (“All systems normal”) |
| Bot Protection | **Inactive** — enable before FGCU packet if available on plan |
| Custom Rules | 0 — optional; managed Firewall alone is enough for HECVAT “WAF yes” |

Keep a copy of the Firewall Traffic screenshot in the FGCU packet (example: `vercel-firewall-2026-08-11.png`).

### Recommended follow-up

1. Open Firewall → enable **Bot Protection** (Managed Rules / Bot Fight equivalent on your plan).
2. Optionally add a custom rate rule for `/learning/api/*` later; not required for the baseline “WAF enabled” answer.
3. Confirm **Deployment Protection** remains on for Preview ([`PRODUCTION_DEPLOY.md`](../PRODUCTION_DEPLOY.md) §7).

## Enablement steps (reference)

1. Open [Vercel Dashboard](https://vercel.com) → SOL production project.
2. Go to **Firewall** → **Traffic** / **Rules**.
3. Confirm Firewall shows **Active** for Production.
4. Enable Bot Protection when available.
5. Screenshot the active state for the HECVAT packet.

## HECVAT wording

- **Now (Firewall active, bot protection off):** “Yes — Vercel Firewall is active on production. Application also enforces CSP, HSTS, and Upstash rate limits. Bot protection enablement in progress.”
- **After Bot Protection on:** “Yes — Vercel Firewall with bot protection on production; plus application rate limiting and security headers.”

## Compensating controls already in code

- CSP + HSTS + frame deny — `next.config.ts`
- Distributed rate limits — `lib/rateLimit.ts` (required in production)
- Clerk bot protection on auth surfaces (Turnstile sign-up — see [`CLERK_AUTH_CONTROLS.md`](./CLERK_AUTH_CONTROLS.md))

## Checklist

- [x] Firewall enabled on production (2026-08-11)
- [x] Screenshot attached / retained
- [ ] Bot Protection enabled
- [ ] Ruleset noted: Vercel managed Firewall (Bot Protection: pending)

**Operator sign-off:** __________________ (date: ________)
