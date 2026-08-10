# Access Control Policy

- Authentication via Clerk (unique accounts).
- Authorization: `STUDENT` / `PROFESSOR` / `ADMIN` enforced in `lib/auth.ts` and API routes.
- Admins reviewed quarterly ([`../evidence/ACCESS_REVIEW_TEMPLATE.md`](../evidence/ACCESS_REVIEW_TEMPLATE.md)).
- Cloud consoles (Vercel, Neon, Clerk, OpenAI, Stripe, Sentry, Upstash) use SSO or unique MFA-backed accounts; remove access on offboarding within 1 business day.
- No shared production passwords; no production secrets in preview environments.
