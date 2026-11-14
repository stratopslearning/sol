# Gate 4 report — Wave 4 (items 24–30): AI, CI, LTI, tutor

- **24 AI gateway.** `lib/ai/gateway.ts` (`getAiClient(purpose)`, `runAi({tenantId,…})`) is the only importer of
  `createOpenAIClient`. `lib/ai/redisBudget.ts`: Upstash atomic Lua check-and-incr per tenant/window
  (`AI_BUDGET_CAPACITY`, `AI_BUDGET_WINDOW_MS`), falls back to the in-process bucket when Upstash is unset or errors.
  Migrated: `lib/grading.ts`, `lib/gradingRubric.ts`, `lib/chatbot/client.ts`, `lib/knowledge/embed.ts`,
  `lib/authoring/{generate,propose,refine,switchUp}.ts`. ESLint `no-restricted-imports` bans `@/lib/ai/openai` and value
  imports of `openai` outside the gateway (`eslint.config.mjs`; **lint not runnable locally**).
  Budget reservation (`runAi`) is available but call sites still use `getAiClient`; wrapping individual calls with
  `runAi` + tenant is a follow-up (durable accounting still goes through `recordAiUsage`).
- **25 grading cache.** Verified: key = tenant + question + rubricVersion + modelVersion + scoringVersion + materialsHash + normalized answer.
- **26 CI.** `.github/workflows/ci.yml`: new `isolation-pgvector` job (ephemeral `pgvector/pgvector:pg16`, migrate as owner,
  tests as `sol_app` so FORCE RLS applies, `DEV_DB_HOSTS=localhost` for the dev-DB guard) + non-blocking `a11y-axe` stub.
  YAML parses; **not run on GitHub**. Assumes `0034_app_roles` creates `sol_app` (password reset in a step).
- **27 field encryption.** `docs/architecture/field-encryption.md`; `lib/crypto/cacheKeyHmac.ts` (opt-in
  `CACHE_KEY_HMAC_SECRET`, wired into `computeCacheKey`); decrypt-boundary comments in `fieldEncryption.ts` / gateway.
  Decrypt-inside-gateway is a TODO comment, not enforced.
- **28 LTI register.** `app/api/lti/register/route.ts` now supports IMS **Dynamic Registration** (`openid_configuration` +
  `registration_token`): fetch/validate platform config (https-only, private-host SSRF guard, issuer/host match), POST the
  tool registration, store issued `client_id`, upsert `lti_platforms`, audit. Manual mode retained. `lib/lti/dynamicRegistration.ts` + tests.
  Gate is `platformStaff` (not `role === 'ADMIN'`).
- **29 tutor.** `tutorAssessmentLock.test.ts` (SHA-256 goldens of the frozen rules + invariants), `tutorCitations.test.ts` (real footnote tests + `it.todo` stubs).
- **30 insights accept.** Verified it creates `authoring_revisions`. Fixed two bugs: `redirect()` (throws `NEXT_REDIRECT`) was inside
  the `try` so the form path returned an error response → now a 303 with base path; null tenant now 404 instead of a NOT NULL violation.

## Tests
New: `aiGatewayBudget`, `dynamicRegistration`, `cacheKeyHmac`, `tutorAssessmentLock`, `tutorCitations`. Unit suite: 80 files / 454 passed / 4 todo.

## Risks
- Redis Lua path unexercised against real Upstash (unit tests cover process fallback + script shape only).
- Changing the tutor rules/policies now fails the golden tests by design.
- `AuthoringClient.tsx` (in-progress, not mine) lacks the `initialRefineRevisionId` prop the accept redirect targets (`?refineRevision=`).
