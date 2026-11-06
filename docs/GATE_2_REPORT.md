# Gate 2 report — Wave 2 (items 10–18): authorization cutover

## Migrations (expand-then-contract; none of the prior `drizzle/00*.sql` edited; journal idx 43–44 appended)
| Migration | What |
| --- | --- |
| `0043_role_binding_constraints.sql` | `(role, scope_type)` CHECK, unique **active** `(user_id, scope_type, scope_id)` index, membership role `member` backfill. **Hard-fails if conflicts exist.** |
| `0044_drop_users_role.sql` | `platform_staff` backfill, `users.role` made nullable + deprecated. The physical `DROP COLUMN` is an opt-in step (`scripts/contract-drop-users-role.ts`). |

Operator order: `node --import tsx scripts/report-role-binding-conflicts.ts [--apply]` (auto-resolves only strict permission
supersets; exits non-zero otherwise) → migrate → `scripts/backfill-platform-staff.ts` → set `LEGACY_ADMIN_ROLE_FALLBACK=0` →
`scripts/contract-drop-users-role.ts` (guarded; `assertDevDatabase`).

## Items
- **10** constraints + conflict report (`lib/authz/bindingConflicts.ts`, `scripts/report-role-binding-conflicts.ts`).
- **11-shadow** `lib/authz/shadowAuthorize.ts` (`shadowAuthorize`, `shadowCompare`): returns the legacy answer, logs
  `authz.shadow_mismatch` JSON; wired into `gates.ts`. Disable with `SHADOW_AUTHZ=0`.
- **11 cutover** (legacy-authz count **239 → 117**; baseline lowered each batch via `scripts/prune-legacy-authz-allowlist.mjs`):
  - 11a courses/sections ✅ (`lib/authz/courseAccess.ts`, `lib/professor/sections.ts`, `graderSections.ts`, `createSection.ts`, section/gradebook pages)
  - 11b quizzes ✅ core (`lib/quizAccess.ts`: `professorCanAccessQuiz`, `userCanWriteQuiz`, `accessibleQuizSectionIds`; quiz questions/attempts routes; `lib/professor/{quizzes,mutations}.ts` quiz paths)
  - 11c chatbots ✅ core (`lib/chatbot/access.ts`: `userCanWriteChatbot`, binding-based `professorEnrolledInSections`; chatbot create/update/assign/duplicate routes + MCP mutations)
  - 11d grading/attempts ✅ (`lib/professor/grading.ts` list/export via bindings)
  - 11e overrides ✅ (`lib/professor/overrides.ts`)
  - 11f knowledge/access ✅ (full rewrite of `lib/knowledge/access.ts`)
  - 11g analytics ✅ (`lib/analytics/*`, k-anonymity)
  - 11h LTI ⏳ TODO (`lib/lti/links.ts`, `app/api/lti/launch`, `nrps.ts`)
  - 11i exports ⏳ partial (`exportResultsCsv` done; student/workspace export routes untouched)
  - 11j admin ✅ (~21 `app/api/admin/**` routes → `requirePlatformStaff`; dashboards `requireTeachingAccess`)
  - Remaining sites carry `TODO(authz-cutover …)` headers (27 files). Display-only role uses (Navbar, Hero, payment, devGate) intentionally remain.
- **12** knowledge coordinator power = `authorize('knowledge.manage')` (not membership).
- **13** membership seat-only: `'member'` role enum + backfill; writers write only `'member'`; entitlement binding fallback removed.
  Doc comment records the planned `workspace_memberships.role` column drop (contract step, not yet applied).
- **14** token ∩ bindings: `lib/authz/tokenScopes.ts` (`effectiveScopesForUser`); `professorAuth`/`mcpAuth` no longer require a global role.
  `professorOnly` is retained only for the *join-by-code* bootstrap route.
- **15** dashboards use `requireTeachingAccess`; platform area uses `requirePlatformStaff`.
- **16** ownership transfer UI (`components/workspace/TransferOwnershipForm.tsx`), `ownership.ts` guarantees ≥1 owner, staff invites email-bound.
- **17** k-anonymity (`lib/analytics/kAnonymity.ts`, `ANALYTICS_K_ANONYMITY_MIN`, default 5).
- **18** `users.role` retire path: `platformStaff` preferred in `getOrCreateUser`; schema.ts kept compiling; drop is a guarded script.

## Behavior changes to be aware of
- Soft-deleted quizzes are now 404 on `GET /api/quiz/:id/questions` for everyone (previously visible to ADMIN).
- Answer keys are returned only to callers with `content.write` on the quiz (previously owner-professor or any ADMIN).
- Archive / visibility / assign on quizzes: any `content.write` holder (co-instructors), not only the owner.
- MCP `enroll_section` now also creates the seat + `co_instructor` binding (mirrors the REST route).

## Tests
- New: `bindingConflicts`, `tokenScopes`, `kAnonymity`, `shadowAuthorize` (all pass).
- Updated: `mcpAuth` (binding stubs), `mcpProtocol` (binding-derived section list).
- Full unit suite: 454 passed / 4 todo.

## Risks / not done
- ESLint is not installed in the sandbox: the allowlist pruning used the rule's own regexes; `npm run lint` is **unverified**.
- `0043` will refuse to apply on data with unresolved conflicts — by design.
- Shadow mismatch logs need a week of production-like traffic review before flipping `LEGACY_ADMIN_ROLE_FALLBACK=0`.
- 11h LTI and 11i student/workspace exports not converted; `lib/professor/discussions.ts`, `lib/interactives/*`, `lib/learning/lessons.ts` still legacy.
- Three UI files owned by in-progress work (`MaterialsClient.tsx`, `quiz/[quizId]/results/page.tsx`, `courses/[courseId]/page.tsx`) had syntax errors during this session and were NOT edited.
