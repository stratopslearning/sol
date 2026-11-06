# SOL product overview (as built)

**Date:** 2026-11-04  
**Method:** code-only read of `/Users/yashajaysawant/Projects/sol-main`. No application, schema, or env changes.  
**Evidence rule:** claims cite `file:line`, a route path, or `npm test` output. Anything not confirmed in code is marked **unverified**.  
**Inventory:** 98 `app/**/page.tsx`, 145 `app/api/**/route.ts`, 93 `tests/**/*.test.ts`.  

**Code audit agents (read-only):** [Explore stack](fe6cf791-bc3c-447a-bab1-5cd148a13f4c), [Explore authz](e8af53ab-f788-4ec8-bb6b-3a9b024660c8), [Explore pages](d4f205a3-f876-46ea-bc57-e8991717ceac), [Explore modules](e9fd027b-8db2-4b51-94c9-8197bcc9d248).


## 1. What SOL is today

SOL is a multi-tenant teaching and learning platform: instructors run courses (materials, AI authoring, quizzes, tutors, analytics); students take work and get AI feedback; workspace admins manage seats/billing/LTI; platform staff operate across tenants with support grants. There is no separate `organizations` table — a **workspace** is the tenant root (`app/db/schema.ts:50-81`).


### 1.1 Stack and services

| Layer | Implementation | Evidence |
| --- | --- | --- |
| App | Next.js 15.3.8 App Router, React 19, Tailwind | `package.json:91` (`next`) |
| DB | Neon Postgres + Drizzle + `@neondatabase/serverless` | `package.json:38,80`; `app/db/index.ts` |
| Auth | Clerk (`@clerk/nextjs`); Edge `clerkMiddleware` | `package.json:35`; `middleware.ts:113-117` |
| AI | OpenAI only via `lib/ai/gateway.ts` + smart router `lib/ai/modelRouter.ts` | task→tier: fast `gpt-5-mini` (grade/tutor/skeleton), balanced `gpt-4.1-mini` (refine/switch_up/insights), strong `gpt-4.1` (build/review/rubric/escalate); env `SOL_MODEL_*`; embeddings `text-embedding-3-small` |
| Files | AWS S3 (+ Textract path) | `package.json:31-33`; `lib/knowledge/storage.ts`; `lib/interactives/storage.ts` |
| Jobs | `JOBS_BACKEND` = `after` \| `inngest` | `lib/env.ts:68-73`; `lib/jobs/backend.ts:11-14`; functions `lib/jobs/functions.ts:215-225` |
| Cache / RL | Upstash Redis; in-memory fallback | `lib/env.ts:42-43`; `lib/rateLimit.ts` |
| Payments | Stripe Checkout + webhooks; paywall off unless `NEXT_PUBLIC_PAYMENTS_ENABLED` | `lib/featureFlags.ts:24-26`; `app/api/stripe/*` |
| Observability | Sentry + optional Braintrust | `sentry.*.ts`; `lib/ai/tracing.ts` |
| LMS | LTI 1.3 behind `LTI_ENABLED` | `lib/env.ts:97-109`; `lib/lti/config.ts:31` |

Deploy (docs): two Vercel projects (StratOps owns crons; teachwithsol host routing) — `PRODUCTION_DEPLOY.md:11-41`. **unverified:** which Neon branch production uses.


### 1.2 Request flow (sign-in → data → jobs → AI)

```text
Browser
  → Edge middleware (Clerk session, host rewrite, CSRF/body limits on /api)
  → page/API: getOrCreateUser (clerk_id → email relink → upsert)
  → desk gate (requireTeachingAccess | requireLearningAccess | requireWorkspaceAdminAccess | requirePlatformStaff)
  → authorize(permission, resource) on bindings / student_sections / support grant
  → withTenant / withRequestTenant (set_config app.tenant_id [, app.user_id])
  → sync work OR enqueue* → Inngest | next/after → worker withTenant → OpenAI → write
  → HTML / JSON
```

| Step | Evidence |
| --- | --- |
| Middleware defers DB/authz | `middleware.ts:23-30`, session gate `305-316` |
| User upsert / email relink | `lib/getOrCreateUser.ts:158-170`, `228-295` |
| Desk gates | `lib/authz/gates.ts:73-131` |
| Core authorize | `lib/authz/authorize.ts:190-231` |
| Tenant GUC | `lib/db/tenantContext.ts:15-47`; request wrapper `lib/db/requestTenant.ts:41-48` |
| Enqueue + AI cap | `lib/jobs/enqueue.ts:66-94` (cap skip `76-84`); jobs served `app/api/inngest/route.ts:10-13` |
| Active workspace cookie | `lib/workspace/activeWorkspace.ts:7-22` |

**Background jobs** (`lib/jobs/functions.ts`):

| Function | Trigger |
| --- | --- |
| `grade-attempt` | `grading/attempt.requested` |
| `grade-attempts-batch` | `grading/attempts.batch.requested` |
| `process-material` | `knowledge/material.process` |
| `process-knowledge-document` | `knowledge/document.process` |
| `sync-knowledge-connector` | `knowledge/connector.sync` |
| `process-book` | `books/book.process` |
| `lti-passback-drain` | `lti/passback.drain` |
| `analytics-rollups` | cron `0 6 * * *` |
| `chatbot-session-retention` | cron `0 3 * * 0` |

Vercel crons (grade-pending, process-materials, lti-roster, lti-passback) are a StratOps safety net (`scripts/write-vercel-json.mjs` / `PRODUCTION_DEPLOY.md`).


## 2. Data model

### 2.1 Hierarchy

| Concept | Table | Notes | Evidence |
| --- | --- | --- | --- |
| Tenant / org | `workspaces` | Types `creator` / `department` / `institution`; optional `parent_workspace_id`; **id is tenant root** (no `tenant_id` column) | `app/db/schema.ts:50-81` |
| Seat | `workspace_memberships` | Writers force `role='member'`; **no authz power** | `app/db/schema.ts:83-121`; `lib/workspace/access.ts:190-230` |
| License / usage | `workspace_licenses`, `workspace_usage_daily` | Workspace-scoped | `app/db/schema.ts:127-166` |
| Invites | `workspace_invites` | Org owner/admin/faculty claim | `app/db/schema.ts:190+` |
| Power | `role_bindings` | Scoped roles; has `tenant_id` | `app/db/schema.ts:220-263` |
| Support | `support_access_grants` | Platform staff → tenant data | `app/db/schema.ts:269-293` |
| Course | `courses` | `workspace_id` + `tenant_id` | `app/db/schema.ts:299-328` |
| Offering | `course_offerings` | Term instance; NOT NULL `tenant_id` | `app/db/schema.ts:331-361` |
| Section | `sections` | Under offering | `app/db/schema.ts:364-402` |
| Staff link | `professor_sections` | Legacy join + `professorId`; still written alongside bindings | `app/db/schema.ts:437-464` |
| Student enroll | `student_sections` (+ `student_offerings`) | Learner authority | `app/db/schema.ts:467-510` |
| Content | `quizzes`/`questions`/`quiz_sections`, `chatbots`/`chatbot_*`, `course_materials`, `knowledge_documents`/`course_knowledge_links`, `interactives`, `lessons`, books | Most carry `tenant_id` + often `professorId` creator stamp | schema blocks ~561–1239 |
| Grades | `attempts`, `grade_overrides`, `regrade_requests`, `grading_cache` | | `app/db/schema.ts:724-954` |
| Authoring | `course_outlines`, `outline_*`, `authoring_*` | | schema authoring block |
| Audit | `audit_log` | `tenant_id` nullable | `app/db/schema.ts:863-890` |
| LTI | `lti_platforms`, `lti_deployments`, `lti_section_links`, `lti_user_links`, `lti_line_items`, `lti_passback_jobs` | All have `tenant_id` | `app/db/schema.ts:2119-2297` |


### 2.2 Tenant wall

| Class | Tables | Mechanism |
| --- | --- | --- |
| Teaching / content (FORCE RLS + `tenant_id`) | courses, offerings, sections, enrollments, quizzes, attempts, chatbots, materials, knowledge_*, authoring_*, LTI_*, grade_overrides, regrade_requests, quiz_versions, role_bindings, support_access_grants, audit_log, … | `drizzle/0040_rls_force.sql`, `0042_tenantize_remaining.sql`; GUC via `withTenant` |
| Workspace-scoped (FORCE RLS, **no** `tenant_id` column) | `workspaces`, `workspace_memberships`, `workspace_licenses`, `workspace_invites`, `workspace_usage_daily` | Policies on `workspace_id` (`0040`) |
| Global / allowlisted (no tenant wall) | `users`, `stripe_events`, `clerk_events`, migrator | `scripts/tenant-schema-allowlist.json:2-8` |

CI guard: `scripts/check-tenant-schema.ts:18-71`. DEFINER helpers for reads under FORCE RLS: migrations `0051`–`0056`, `lib/db/entityScopedReads.ts`, `lib/authz/userScopedReads.ts`.


## 3. Roles and access

**Mental model:** membership = seat; **`role_bindings` + `student_sections` = power**; `users.platform_staff` = admin shell; tenant PII needs `support_access_grants`. Global `users.role` removed from Drizzle (`app/db/schema.ts:20-37`; `drizzle/0044_drop_users_role.sql`); shadow-only (`lib/authz/shadowAuthorize.ts:50-57`).


### 3.1 Binding roles

Valid pairs (`lib/authz/permissions.ts:150-159`):

| Role | Scopes | Permissions (summary) | Evidence |
| --- | --- | --- | --- |
| `owner` | organization | All permissions | `permissions.ts:121-122` |
| `admin` | organization, department | Billing/people/policy/audit/export/LTI/catalog/knowledge — **no** grade/content publish | `59-74` |
| `faculty` | organization, department | Catalog + `content.read` only | `76-81` |
| `lead_instructor` | offering, section | Full teaching ops | `83-98` |
| `co_instructor` | offering, section | Lead minus `staff.remove_lead` | `101` |
| `ta` | offering, section | Read content/roster, `grade.write`, `regrade.resolve`, tutor transcripts | `103-108` |
| `grader` | offering, section | `content.read`, `grade.write` only | `111` |
| `student` (implicit) | via enrollment | submit/tutor/own grades/export + `content.read` | `113-118`, `authorize.ts:213-218` |


### 3.2 How roles are created

| Path | Result | Evidence |
| --- | --- | --- |
| Onboarding / provision | `owner` @ org + seat | `app/api/onboarding/workspace/route.ts:45-55`; `lib/workspace/provision.ts:126-167` |
| `/workspaces/claim` | owner/admin/faculty binding | `lib/workspace/invites.ts:168-199` |
| Create course / section | `lead_instructor` @ offering/section | `lib/offerings/create.ts:59-73`; `lib/professor/createSection.ts:133-149` |
| Professor enroll code | `co_instructor` @ section | `app/api/professor/enroll/route.ts:72-93` |
| Section staff / invite | `ta` / `grader` | `lib/authz/staffGrants.ts:51-75`; `/staff/claim` `app/staff/claim/page.tsx:47` |
| LTI faculty | `ta` or `co_instructor` | `lib/lti/facultyEnrollment.ts:21-87` |
| Student join code | `student_sections` only | `app/api/student/enroll/route.ts` |
| Ownership transfer | new `owner`; prior → `admin` | `lib/authz/ownership.ts:17-80` |
| Platform staff | `users.platform_staff` (backfill script) | `scripts/backfill-platform-staff.ts:1-7` — **not** invite-claim |

`grantOfferingStaff` exists (`lib/authz/staffGrants.ts:27-48`) but has **no non-test call sites** in app code (**unverified** product use).


### 3.3 Desk gates

| Gate | Allows | Deny redirect | Evidence |
| --- | --- | --- | --- |
| `requireTeachingAccess` | Any `TEACHING_ROLES` binding | student → `/dashboard/student`; else onboarding | `gates.ts:73-90` |
| `requireLearningAccess` | Active enrollment **or** no teaching bindings | teaching-only → `/dashboard/professor` | `gates.ts:93-102` |
| `requireWorkspaceAdminAccess` | `audit.read` on org (= owner/admin) | `/dashboard/professor` | `gates.ts:105-118` |
| `requirePlatformStaff` | `user.platformStaff` | teaching/learning/onboarding | `gates.ts:121-131` |

Per-resource checks still call `authorize` / `professorCanAccessQuiz` (`lib/quizAccess.ts:33-69`). Creator-only is **not** enough: fallback requires `professorId` **and** a teaching binding (`65-68`).


### 3.4 What each role cannot do (coded)

| Actor | Cannot | Evidence |
| --- | --- | --- |
| Membership alone | Anything via `authorize` | `authorize.ts:185-188` |
| `faculty` | Grade, write content, staff | `permissions.ts:76-81` |
| `admin` (org) | Section grading / content publish | ADMIN_PERMS vs LEAD |
| `ta` | `content.write`/`publish`, override, release, staff.manage | `103-108` |
| `grader` | Roster, regrade resolve, publish | `111` |
| `co_instructor` | `staff.remove_lead` | `101` |
| `platform_staff` without grant | Tenant `authorize` | `authorize.ts:197-199`; `supportAccess.ts:23-28` |
| Teaching-only user | Student enroll API | `gates.ts:65-70`; `app/api/student/enroll/route.ts:44-46` |


## 4. Every page (98), by area

**Shared chrome:** root `app/layout.tsx` (Clerk, theme, toaster). Almost no nested Next layouts (only `app/dashboard/student/layout.tsx` toast). In-page: `AppShell` + `lib/nav-config.ts` sidebars; course tabs via `CourseHubShell` (`components/professor/CourseHubShell.tsx:18-26`); student section tabs via `SectionHubShell`.


### 4.1 Public

| URL | Who | Layout | Shows / actions | Status |
| --- | --- | --- | --- | --- |
| `/` | Anyone | `Navbar`/`Footer` marketing | Landing | complete |
| `/blog`, `/blog/[slug]` | Anyone | `BlogShell` | Posts | complete |
| `/docs`, `/docs/[slug]` | Anyone | `DocsShell` | Docs markdown | complete |
| `/privacy`, `/terms`, `/security`, `/dmca`, `/unsubscribe` | Anyone | `LegalShell` | Static legal | complete |


### 4.2 Sign-up / onboarding / claims / payment

| URL | Who | Layout | Shows / actions | Status |
| --- | --- | --- | --- | --- |
| `/login/[[...rest]]` | Public; demo mode may redirect Cal | `AuthShell` + Clerk | Sign-in | complete (`app/login/[[...rest]]/page.tsx:14-15`) |
| `/signup/[[...rest]]` | Public; same demo redirect | `AuthShell` | Sign-up | complete |
| `/onboarding` | Authenticated, no bindings | `AppShell` | Create workspace / enroll (`OnboardingClient`) | complete (`app/onboarding/page.tsx:12-18`) |
| `/payment` | Learner when paywall on | `AuthShell` | Stripe checkout | **partial** — redirects away if `!paymentsEnabled()` (`payment/page.tsx:36-37`) |
| `/workspaces/claim` | Invite token | Bare main | Peek + claim org role | complete |
| `/staff/claim` | Authenticated invite | Bare main | Claim TA/grader → `/dashboard/ta` | complete (`staff/claim/page.tsx:47`) |
| `/dashboard` | Authenticated | Redirect only | Area router | **duplicate**/router (`dashboard/page.tsx:16-51`) |
| `/dashboard/home` | Teaching + multi-area | `AppShell` | Workspace switcher / course counts | complete |


### 4.3 Student

**Gate:** `requireStudent` = `requireLearningAccess` + payment (`lib/auth.ts:80`). Layout: `AppShell` role student + section hub where noted.

| URL | Shows / actions | Status |
| --- | --- | --- |
| `/dashboard/student` | Enrollments, quizzes, enroll/export | complete |
| `/dashboard/student/sections`, `/archived` | Section lists | complete |
| `/dashboard/student/sections/[sectionId]` (+ `/assignments`, `/books`, `/grades`) | Section hub activities/books/grades | complete |
| `/dashboard/student/sections/[sectionId]/work` | Redirect → assignments | **duplicate** |
| `/dashboard/student/assignments` | Cross-section work (+ type filters) | complete |
| `/dashboard/student/calendar` | Due events | complete |
| `/dashboard/student/grades` | Cross-section grades | complete |
| `/dashboard/student/books/[bookId]`, `.../chapters/[chapterId]` | Hosted book TOC/chapter | complete |
| `/dashboard/student/lessons/[id]` | Lesson detail/progress | complete |
| `/dashboard/student/lessons`, `/quizzes`, `/discussions` | Redirect → assignments?type= | **duplicate** |


### 4.4 Instructor / course hub

**Gate:** `requireTeachingAccess` (`gates.ts:73`). Nav: Overview, Courses, Attention, Results, Workspace, Knowledge (`lib/nav-config.ts:81-120`).

**Course hub** (`CourseHubShell` tabs: Overview, Materials, Authoring, Assignments, Sections, Analytics, Insights — `CourseHubShell.tsx:18-26`). Gate + `assertCanManageCourse` → 404 if denied.

| URL | Shows / actions | Status |
| --- | --- | --- |
| `/dashboard/professor` | Desk: sections, attention snippet, enroll, export | complete |
| `/dashboard/professor/courses` | Teachable courses; create course | complete |
| `/dashboard/professor/courses/[courseId]` | Hub overview; copy-from-offering; tutor policy | complete |
| `.../materials` | MaterialsClient: upload/link/library/reprocess | complete (canonical) |
| `.../authoring` | Outline chat propose/approve/build | complete |
| `.../assignments` | Course activities; links to create quiz/tutor/interactive | complete |
| `.../sections` | Section list + create; links to section detail | complete |
| `.../analytics` | Course analytics tables | complete |
| `.../insights` | Rollups + accept insights API | complete (empty until rollups) |
| `/dashboard/professor/attention` | Manual review / regrades / escalations | complete |
| `/dashboard/professor/quiz-results` | Cross-section submissions | complete |
| `/dashboard/professor/sections/[sectionId]` | Roster CSV, staff invites, assignments, Canvas links | complete |
| `.../gradebook` | Section gradebook + overrides | complete |
| `/dashboard/professor/attempt/[attemptId]` | Attempt review / override / regrade | complete |
| `/dashboard/professor/quiz/new`, `/quiz/[id]/edit`, `/results` | Quiz CRUD + release | complete |
| `/dashboard/professor/quiz/[id]/calibration` | Calibration UI | **partial** — titled stub (`calibration/page.tsx:59`) |
| `/dashboard/professor/discussions/new`, `[id]`, `[id]/edit`, `session/[sessionId]` | Chatbot CRUD + transcript | complete |
| `/dashboard/professor/interactive/new`, `[id]/edit`, `import` | Interactive authoring | complete |
| `/dashboard/professor/agent-access` | MCP/API tokens | complete |
| Legacy redirects: `/assignments`, `/materials`, `/materials/[courseId]`, `/authoring`, `/authoring/[courseId]`, `/analytics`, `/analytics/[courseId]`, `/sections`, `/sections/archived`, `/quizzes`, `/discussions` | → courses or hub tabs | **duplicate** |


### 4.5 TA

| URL | Who | Layout | Shows / actions | Status |
| --- | --- | --- | --- | --- |
| `/dashboard/ta` | Teaching access with grant sections; else redirect professor | `AppShell` | Attention subset for TA/grader sections | complete (`ta/page.tsx:40-45`) |


### 4.6 Workspace admin

**Gate:** pages use `requireTeachingAccess` plus billing/capability checks (`userCanManageWorkspaceBilling` / `authorize` for transfer). Note: `requireWorkspaceAdminAccess` exists but workspace pages often gate via teaching + entitlement helpers (**unverified** every subpage uses the same helper).

| URL | Shows / actions | Status |
| --- | --- | --- |
| `/dashboard/workspace` | Team, invites, billing/export, ownership transfer | complete |
| `/dashboard/workspace/knowledge` | Workspace library + connectors | complete |
| `/dashboard/workspace/usage` | Usage metrics (billing-capable / staff) | complete |
| `/dashboard/workspace/audit` | Tenant audit log | complete |
| `/dashboard/workspace/lti` | Workspace LTI registration | complete |


### 4.7 Platform staff (admin)

**Gate:** `requireAdmin` → `requirePlatformStaff` (`lib/auth.ts:76-77`). Layout: `AppShell` role admin.

| URL | Shows / actions | Status |
| --- | --- | --- |
| `/dashboard/admin` | Overview stats, directory | complete |
| `/dashboard/admin/workspaces`, `/courses`, `/sections`, `/sections/archived`, `/users`, `/tenants` | Cross-tenant ops | complete |
| `/dashboard/admin/sections/[sectionId]`, `.../gradebook` | Same UI patterns as professor with `role="admin"` | complete (**parallel duplicate** of professor section) |
| `/dashboard/admin/quizzes`, `/quizzes/new` | Cross-workspace quiz library | complete |
| `/dashboard/admin/lti` | Platform Canvas LTI | complete |
| `/dashboard/admin/audit` | Platform audit | complete |
| `/dashboard/admin/assignments` | Redirect → quizzes | **duplicate** |

Tenant-mutating admin APIs need support grant (`requireSupportGrant` — e.g. `app/api/admin/course/[courseId]/route.ts:47-55`).


### 4.8 Quiz / chatbot / interactive (learner runtime)

| URL | Who | Layout | Shows / actions | Status |
| --- | --- | --- | --- | --- |
| `/quiz/[quizId]` | Learning access + enrollment + window | `AppShell` student | Take quiz (`QuizTakeForm`) | complete (`quiz/[quizId]/page.tsx:58-99`) |
| `/quiz/[quizId]/results`, `/review` | Attempt owner (or teaching) | `AppShell` | Results / feedback / retry | complete |
| `/chatbot/[chatbotId]` | Learning + entitlement | **No AppShell** — `ChatbotSession` | Tutor session | complete |
| `/interactive/[id]` | `requireAuth` + student access | `AppShell` | Interactive take | complete |


### 4.9 LTI

| URL | Who | Layout | Shows / actions | Status |
| --- | --- | --- | --- | --- |
| `/lti/bridge` | LMS ticket → Clerk | Minimal client | `signIn.create({ strategy: 'ticket' })` → dashboard | complete |
| Workspace/admin LTI pages | See §4.6–4.7 | `AppShell` | Register platforms | complete |

Launch/passback APIs under `app/api/lti/*` — product completeness depends on `LTI_ENABLED` + Canvas config (**unverified** live LMS).


## 5. Main workflows

Status is from **code paths** (routes/APIs/jobs present), not a live smoke in this pass.

| Workflow | Status | Steps (abbrev.) | Key evidence |
| --- | --- | --- | --- |
| Sign-up | **works** | Clerk `/signup` → `getOrCreateUser` → `/onboarding` if unbound | `signup/.../page.tsx`; `getOrCreateUser.ts`; `onboarding/page.tsx:15-18` |
| Department setup | **works** (self-serve vs admin **partial**) | Onboarding `path:'department'` → `provisionWorkspace`; faculty CSV; admin workspaces API | `onboarding/workspace/route.ts:15-52`; `faculty-import/route.ts`; `provision.ts:91-108` |
| Materials ingest | **works** | Upload/URL → S3 → `enqueueMaterialProcess` → chunk/embed | `professor/materials/route.ts`; `lib/knowledge/process.ts:17-76`; job `functions.ts:86-106` |
| Authoring | **works** | Chat propose → outline → publish/release | `authoring/*` APIs; `lib/authoring/propose.ts`, `generate.ts`, `publish.ts` |
| Student taking work | **works** | Enroll → `/quiz/[id]` start/progress/submit | `student/enroll`; `executeQuizSubmit.ts:52-80` |
| Grading | **works** | Submit → partial → `enqueueGradeAttempt` → `pendingGrader` → complete; cap skips enqueue | `executeQuizSubmit.ts:220-221`; `enqueue.ts:76-94`; `pendingGrader.ts:207-253` |
| Override / release | **works** | Override API; release sets `grades_released_at`; may enqueue LTI passback | `professor/overrides.ts`; `release-grades/route.ts`; `pendingGrader.ts:267-268` |
| Regrade | **works** | Student request; professor resolve; single/bulk regrade jobs | `student/regrade-requests`; `regradeAttempt.ts`; `grade-attempts-batch` |
| Tutor | **works** (citation E2E **partial**) | Start/message + RAG retrieve (requires `tenantId`) | `chatbot/.../message`; `retrieve.ts:29-52`; citation todos in tests |
| TA grading | **works** | Staff invite → `/staff/claim` → `/dashboard/ta` → same grade APIs | `staffInvites.ts`; `ta/page.tsx` |
| Analytics | **partial** | Cron rollups + course analytics/insights UI | `computeRollups.ts`; `analytics-rollups` job; insights empty until data |
| Rollover | **works** (UI if sources exist) | `copy-from` offering clones content/links | `copyOffering.ts:39-43`; `CopyFromOfferingDialog.tsx` |
| Ownership transfer | **works** | Owner-only API; ≥1 owner invariant | `ownership.ts:17-80`; `transfer-ownership/route.ts` |
| Support access | **partial** | Enforce grant on staff tenant APIs; **no TS writer** for inserts | `requireSupportGrant.ts`; grep: schema/readers only |
| Export | **partial** | Workspace + student JSON exports; not full FERPA product pack | `workspace/export`, `student/export` |
| Retention / deletion | **partial** | Weekly chatbot session retention (+ optional feedback purge); admin purge routes; **no** self-serve tenant delete | `lib/jobs/retention.ts:24-31`; `admin/**/purge` |


## 6. Modules

### Knowledge
- **Does:** Upload/URL/zip/connectors → process → chunks + embeddings → retrieve for tutor/authoring; workspace library + course links.
- **Data:** `course_materials`, `course_material_chunks`, `knowledge_documents`, `knowledge_chunks`, `course_knowledge_links`.
- **Jobs:** `process-material`, `process-knowledge-document`, `sync-knowledge-connector`, cron process-materials.
- **AI:** embeddings `text-embedding-3-small` (`lib/knowledge/constants.ts:37`) via gateway.
- **Limits:** `checkAiBandAvailable` on process (`process.ts:61-75`); upload size caps (`constants.ts:11-18`).
- **Failure:** retrieve returns `[]` (`retrieve.ts:26-52`); tutor falls back to quiz-only context.
- **Gaps:** dual stack + `LEGACY_MATERIALS_READ` (`retireLegacyMaterials.ts:1-34`); offering filter optional (`retrieve.ts:36-37`).

### Authoring
- **Does:** Outline chat → generate items → publish/release quizzes; `copyOffering` rollover.
- **Data:** `course_outlines`, `outline_*`, `authoring_revisions`, `authoring_messages`.
- **Jobs:** none (sync OpenAI in request).
- **AI:** `gpt-4o-mini` / env override; `getAiClient('authoring')`.
- **Limits:** AI band in `generate.ts:784-785`.
- **Gaps:** post-release edit guards exist for quizzes (`questionEditGuard.ts:78`); uniform immutability across artifact types **unverified**.

### Learning
- **Does:** Student activities — quizzes, tutors, lessons, books, interactives.
- **Data:** enrollments, `chatbots`/`sessions`, `lessons`, books, `interactives`.
- **AI:** tutor `gpt-4.1-mini`.
- **Retention:** chatbot sessions weekly (`retention.ts`).
- **Gaps:** assessment-lock / citation covered partly by unit tests + todos.

### Assessment
- **Does:** Submit scoring (MCQ inline; SA cache/`pendingGrader`); overrides; attention queue; regrades.
- **Data:** `attempts`, `grading_cache`, `grade_overrides`, `regrade_requests`.
- **Jobs:** `grade-attempt`, `grade-attempts-batch`, cron grade-pending.
- **AI:** `gpt-5-mini-2025-08-07`; scores via `computeScoreFromRubric` (code, not model).
- **Failure:** `manual_review` after max attempts (`pendingGrader.ts:219-224`); at AI cap enqueue silently skips (`enqueue.ts:76-84`).
- **Gaps:** calibration stub UI.

### Analytics
- **Does:** Daily rollups; course analytics + insights accept.
- **Data:** `analytics_rollups`.
- **Jobs:** `analytics-rollups` (+ cron mirror).
- **Limits:** k-anonymity helpers (`lib/analytics/kAnonymity.ts`).
- **Gaps:** no `computeRollups` unit test; insights→authoring loop thin.

### LTI
- **Does:** OIDC login/launch, NRPS roster, AGS passback drain.
- **Data:** `lti_*` tables + `lti_passback_jobs`.
- **Jobs:** `lti-passback-drain`; crons roster/passback.
- **Flags:** `LTI_ENABLED` + env bundle (`lib/env.ts:97-203`).
- **Gaps:** dynamic registration helpers exist (`dynamicRegistration.ts`); not a polished self-serve product. Live Canvas **unverified**.

### MCP / API
- **Does:** `POST /api/mcp` professor tools; REST under `app/api/**` (145 routes); PATs.
- **Auth:** MCP teaching-area (`lib/api/mcpAuth.ts`); scopes ∩ bindings (`tokenScopes.ts`).
- **Gaps:** token routes still note authz cutover TODO (`app/api/professor/tokens/route.ts:1`).

### Billing / caps
- **Does:** Licenses, usage, Stripe; `checkAiBandAvailable` / `assertAiBandAvailable` (`aiCapGuard.ts:15-39`).
- **Gateway:** `lib/ai/gateway.ts` (timeouts/budget; TODO decrypt noted at L11).
- **Gaps:** paywall default off (`featureFlags.ts:24-26`); no unified in-app “at cap” UX; grading skip is silent.

### Ops
- **Does:** `logAudit`; workspace/student export; chatbot retention; admin purge; support-grant **checks**.
- **Gaps:** no support-grant creation API/UI in repo; no tenant self-delete product.


## 7. Tests

See canonical runbook: [`docs/TESTING.md`](TESTING.md). **Vitest only** (no Playwright).

### 7.1 Layout (redesign 2026-11-04)

| Project | Command | Contents |
| --- | --- | --- |
| `unit` | `npm test` | `tests/unit/**` — always on PR |
| `db` | `npm run test:db` | `tests/db/**` + isolation + integration; requires `TEST_DATABASE_URL`; fails in CI if unset |

Factories (`tests/helpers/factories.ts`) and `seedTenantGraph` stamp `tenant_id` + create offerings. SKUs: `creator` / `department` / `institution` (leaf workspace = RLS tenant; institution parent is soft hierarchy).

**CI:** `isolation-pgvector` runs full `test:db` + `check:tenant-schema` (required). Neon secret job optional for branch fidelity.

**Scope note:** TA/grader may bind at **offering or section**; lead may bind at **offering or section** (`ROLE_SCOPE_PAIRS` / `tests/db/authz.scopes.offeringSection.test.ts`).

### 7.2 Coverage map (after redesign)

| Area | Has tests | Still thin |
| --- | --- | --- |
| Tenancy × SKU | `tests/db/tenancy.{creator,department,institution,rls.crossTenant}` | workspace switcher UX |
| Authz / bindings | matrix, scopes, support grant, permissions catalog, isolation `roleBindingsAuthz` | route-handler HTTP mocks |
| Quiz / grading | unit + cache tenant + cap/enqueue source contracts | override API; queue-at-cap product UX |
| Provision / course create | `wf.onboarding.provision`, `wf.course.create` | — |
| Knowledge / authoring / tutor | existing units | process job; citation E2E todos |
| LTI / MCP / workspace | existing units | live Canvas; export routes |
| Co-instructor join code | source contract (documents known hole) | product fix then flip assertion |


## 8. What's left to build


### 8.1 Backlog table

| Item | Area | Why it matters | Effort |
| --- | --- | --- | --- |
| Support-grant create UI/API + audit | Ops / staff | Platform staff cannot productively open tenant PII today | M |
| Offering-owned content (retire `professorId` as ownership) | Authz / Assessment | Rollover, staff grants, clearer authorize | L |
| Retire knowledge dual stack | Knowledge | Duplicate RAG sources / ops confusion | L |
| AI cap product UX (queue/notify when band exhausted) | Billing | Silent grade skips confuse instructors | M |
| Self-serve tenant/workspace delete + broader retention | Ops | Incomplete education-record lifecycle | L |
| LTI self-serve registration polish | LTI | Today ops-heavy / flag-gated | M |
| Quiz calibration beyond stub | Assessment | Page exists but stubbed | M |
| Interactives S3 tenant-prefix cutover | Storage | Course-scoped keys vs knowledge tenant paths | M |
| Unify professor vs admin section/gradebook shells | UI | Parallel duplicates raise maintenance cost | M |
| Delete legacy redirect pages after nav settled | UI | ~16 duplicate routes | S |
| Payments / LTI production enablement checklists | Billing / LTI | Flags default off | S–M (ops) |
| Authoring publish/release + materials job tests | Quality | Core money paths lightly tested | M |


### 8.2 Duplicate pages to merge

Prefer **course hub** and **section hub**; keep redirects until clients/bookmarks clear.

| Keep | Merge / remove |
| --- | --- |
| `/dashboard/professor/courses/[courseId]/{materials,authoring,analytics,assignments,sections}` | `/dashboard/professor/{materials,authoring,analytics,assignments,sections,quizzes,discussions}` redirects |
| `/dashboard/student/assignments` (+ section hub) | `/dashboard/student/{lessons,quizzes,discussions}`, `.../work` |
| One section detail + gradebook implementation | Parallel professor vs admin copies (parameterize `role`) |
| `/dashboard/admin/quizzes` | `/dashboard/admin/assignments` redirect |
| `/dashboard/professor/attention` vs `/dashboard/ta` | Keep both but share queue components (TA = filtered attention) |


### 8.3 Proposed page structure (course hub as home)

```text
Signed-in landing (/dashboard)
  ├─ platform_staff → /dashboard/admin
  ├─ teaching → /dashboard/professor/courses          ← primary home
  │     └─ /courses/[courseId]                        ← course hub
  │           ├─ /materials
  │           ├─ /authoring
  │           ├─ /assignments  → create quiz|tutor|interactive (modals or subroutes)
  │           ├─ /sections → /sections/[sectionId] (roster, gradebook, staff)
  │           ├─ /analytics
  │           └─ /insights
  │     /attention   (cross-course queue)
  │     /workspace/* (billing, invites, knowledge library, LTI, audit)
  │     /ta          (if grant-only TA/grader)
  ├─ learning → /dashboard/student
  │     └─ /sections/[sectionId]/{assignments,books,grades}
  └─ multi-area → /dashboard/home (switcher)

Runtime (not in sidebar): /quiz/*, /chatbot/*, /interactive/*
Claims: /workspaces/claim, /staff/claim
LMS: /lti/bridge
```

Professor desk `/dashboard/professor` becomes a thin “today” strip (attention + recent) or redirects to **Courses**. Section ops stay one hop from hub Sections tab.


---

*End of overview. Code-only; no runtime LMS/AI/S3 verification in this document.*
