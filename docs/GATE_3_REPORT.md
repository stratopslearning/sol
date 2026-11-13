# Gate 3 report — Wave 3 (items 19–23): offering model

## Migrations (journal idx 45–46)
- **`0045_offering_id_not_null.sql`** (item 19): ensures every course has a default offering; backfills `offering_id`
  from section/course on `sections, professor_sections, student_sections, quiz_sections, attempts, chatbot_sections,
  lesson_sections, interactive_sections, book_sections, lti_section_links, chatbot_sessions, course_materials, lessons,
  interactives`; installs `BEFORE INSERT` fill triggers so legacy writers keep working; `SET NOT NULL` **only when no
  NULLs remain** (else `WARNING`, table stays nullable).
  Not derivable → left nullable (follow-up): `quizzes, questions, assignments, chatbots, chatbot_assignments, grading_cache, analytics_rollups`.
  Drizzle `schema.ts` stays `.nullable` for these columns until the migration has run everywhere (avoids breaking typed inserts).
- **`0046_student_offerings.sql`** (item 20): `student_offerings` (tenant RLS FORCE, unique `(student_id, offering_id)`), backfilled from `student_sections`.

## Code
- `lib/offerings/create.ts` (+ `lead_instructor` binding on offering/course create) — item 19.
- `lib/enrollment/sources.ts`: dual-write `student_offerings` on enroll; offering marked DROPPED when the last ACTIVE section drops (best effort, never blocks the section write) — item 20.
- `lib/sections/links.ts` (`linkSection`, `unlinkSection`, `listSectionLinks`, `resolveSectionByExternalId`) + `app/api/professor/section/[sectionId]/links/route.ts` (GET/POST/DELETE) — item 21.
- `lib/authoring/copyOffering.ts`: also clones quizzes (+questions) and chatbots as **inactive drafts**, idempotent by title, never throws — item 22. Result now includes `quizzesCopied`, `chatbotsCopied`.
- `lib/offerings/lifecycle.ts` (`isOfferingEnded`, `assertOfferingWritable`): ended/archived (or past `endsAt`) offerings reject student enroll (`409`) and quiz submit (`lib/executeQuizSubmit.ts`) — item 23.

## Tests
- `offeringLifecycle.test.ts` (pure). Full unit suite green (454 / 4 todo).
- Not executed: migrations 0045/0046 against a real DB (no Postgres in sandbox) — run through the new CI job or `scripts/apply-migration.ts` on `sol-knowledge-dev`.

## Risks
- `student_offerings` FK `offering_id` is CASCADE; the legacy `offering_id` FKs are `ON DELETE SET NULL` and become **incompatible with NOT NULL** — deleting an offering will error until those FKs are re-pointed (`RESTRICT`/`CASCADE`). Follow-up migration.
- Roster/CSV/LTI writers that bypass `upsertStudentEnrollment` do not dual-write yet.
- Lifecycle gate is applied to enroll + submit only (not chatbot start, lesson progress, discussion posts).
