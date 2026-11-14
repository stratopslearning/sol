# Gate 1 report — Wave 1 (items 1–9)

Scope: tenant foundation. Wave 1 was implemented before this session; this report
records what this session verified/repaired so Gate 1 is green for Wave 2.

## What exists (Wave 1 baseline)
- Migrations `0034_app_roles` → `0042_tenantize_remaining`: least-privilege roles (`sol_app`, `sol_migrator`),
  `tenant_id` NOT NULL contract (`0039`), FORCE RLS + `app.tenant_id` GUC (`0040`), `role_bindings` (`0041`),
  remaining tenantization (`0042`).
- `authorize(user, permission, resource)` in `lib/authz/authorize.ts` is the single authority; platform staff
  need a support grant (`lib/authz/supportAccess.ts`).
- `resolve_api_token()` SECURITY DEFINER lookup for PATs (`lib/professorApiTokens.ts`).

## Repairs made this session
- Type errors left by Wave 1 fixed: casts in `lib/audit.ts`, `lib/db/assertRuntimeRole.ts`, `lib/lti/platform.ts`,
  `lib/professorApiTokens.ts`; `ensurePlatformFromEnv()` callers in `app/api/lti/login/route.ts` and
  `lib/lti/lineItems.ts` now pass `resolveLtiWorkspaceId()`.
- Stale unit tests aligned with Wave 1 behavior: `professorApiTokens.test.ts` (SECURITY DEFINER `db.execute`),
  `executeQuizSubmit.test.ts` (`quizVersions`), `env.test.ts` (`DEV_DB_HOSTS` allowlist),
  `vectorRetrievalCrossTenant.test.ts` (unused `@ts-expect-error`).

## Tests
- `npx vitest run tests/unit` → 80 files / 454 passed / 4 todo (citation integration stubs).
- Isolation suite (`tests/isolation`) needs a live DB; run in the new `isolation-pgvector` CI job (Wave 4 item 26).

## Risks
- Isolation tests were not executed locally (no Postgres in the sandbox) — only typechecked.
- `tsc` is clean except one error in a file owned by in-progress work (`AuthoringClient.tsx` prop
  `initialRefineRevisionId`).
