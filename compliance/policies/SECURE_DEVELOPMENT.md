# Secure Development

- Authz checks on every page/API that reads education records.
- Zod validation on mutating APIs.
- No secrets in client bundles except `NEXT_PUBLIC_*` publishable values.
- AI prompts must not include student profile fields; use minimization helper.
- Tests: Vitest unit + integration against Neon test branch before merge when touching data paths.
