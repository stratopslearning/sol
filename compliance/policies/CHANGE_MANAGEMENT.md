# Change Management

- All production code changes via pull request and CI ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)).
- Prefer protected `main` with required checks.
- Environment and secret changes recorded in deploy notes / Vercel activity.
- Emergency hotfixes still require a follow-up PR and postmortem if education records were at risk.
