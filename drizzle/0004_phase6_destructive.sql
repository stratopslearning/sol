-- Phase 6 — destructive schema migration.
--
-- Changes here are destructive (column type changes, FK redefinitions,
-- onDelete policies). Existing data is preserved by interpreting current
-- naive timestamps as UTC. Run a fresh DB backup before applying.
--
-- Sections:
--   1. Convert all `timestamp` columns to `timestamptz` (existing rows
--      interpreted as UTC).
--   2. Drop and recreate FKs with explicit ON DELETE policies.
--   3. Add soft-delete `deleted_at` columns on quizzes/sections/courses,
--      plus partial indexes for fast "active only" queries.
--   4. Add `passing_score` to quizzes (default 60) so the submit route can
--      compute a real pass/fail flag instead of hard-coding `true`.
--
-- This migration is idempotent for steps 3 + 4 (uses IF NOT EXISTS / IF NOT
-- EXISTS index). Steps 1 + 2 are not idempotent: rerunning produces a
-- harmless type=type ALTER but FK drops will fail if already absent. We
-- accept that — a half-applied migration should be reverted by hand.

--> statement-breakpoint
-- 1. Timestamps -> timestamptz. We use AT TIME ZONE 'UTC' so the wall-clock
-- time the row was written is preserved exactly (the application has been
-- writing UTC via `new Date()` already).
ALTER TABLE "users"
  ALTER COLUMN "created_at" TYPE timestamptz USING ("created_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updated_at" TYPE timestamptz USING ("updated_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "last_synced_at" TYPE timestamptz USING ("last_synced_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "courses"
  ALTER COLUMN "created_at" TYPE timestamptz USING ("created_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updated_at" TYPE timestamptz USING ("updated_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "sections"
  ALTER COLUMN "created_at" TYPE timestamptz USING ("created_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updated_at" TYPE timestamptz USING ("updated_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "professor_sections"
  ALTER COLUMN "enrolled_at" TYPE timestamptz USING ("enrolled_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "student_sections"
  ALTER COLUMN "enrolled_at" TYPE timestamptz USING ("enrolled_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "quizzes"
  ALTER COLUMN "start_date" TYPE timestamptz USING ("start_date" AT TIME ZONE 'UTC'),
  ALTER COLUMN "end_date" TYPE timestamptz USING ("end_date" AT TIME ZONE 'UTC'),
  ALTER COLUMN "created_at" TYPE timestamptz USING ("created_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updated_at" TYPE timestamptz USING ("updated_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "quiz_sections"
  ALTER COLUMN "assigned_at" TYPE timestamptz USING ("assigned_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "questions"
  ALTER COLUMN "created_at" TYPE timestamptz USING ("created_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "assignments"
  ALTER COLUMN "due_date" TYPE timestamptz USING ("due_date" AT TIME ZONE 'UTC'),
  ALTER COLUMN "assigned_at" TYPE timestamptz USING ("assigned_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "completed_at" TYPE timestamptz USING ("completed_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "attempts"
  ALTER COLUMN "started_at" TYPE timestamptz USING ("started_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "submitted_at" TYPE timestamptz USING ("submitted_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "stripe_events"
  ALTER COLUMN "received_at" TYPE timestamptz USING ("received_at" AT TIME ZONE 'UTC'),
  ALTER COLUMN "processed_at" TYPE timestamptz USING ("processed_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
ALTER TABLE "audit_log"
  ALTER COLUMN "created_at" TYPE timestamptz USING ("created_at" AT TIME ZONE 'UTC');

--> statement-breakpoint
-- 2. Explicit ON DELETE policies. Drop the existing FKs (created with the
-- default NO ACTION) and recreate them with the chosen policy. Drizzle's
-- naming convention for FKs is `<table>_<col>_<reftable>_<refcol>_fk`.

ALTER TABLE "sections" DROP CONSTRAINT IF EXISTS "sections_course_id_courses_id_fk";
ALTER TABLE "sections"
  ADD CONSTRAINT "sections_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "professor_sections" DROP CONSTRAINT IF EXISTS "professor_sections_professor_id_users_id_fk";
ALTER TABLE "professor_sections"
  ADD CONSTRAINT "professor_sections_professor_id_users_id_fk"
  FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "professor_sections" DROP CONSTRAINT IF EXISTS "professor_sections_section_id_sections_id_fk";
ALTER TABLE "professor_sections"
  ADD CONSTRAINT "professor_sections_section_id_sections_id_fk"
  FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "student_sections" DROP CONSTRAINT IF EXISTS "student_sections_student_id_users_id_fk";
ALTER TABLE "student_sections"
  ADD CONSTRAINT "student_sections_student_id_users_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "student_sections" DROP CONSTRAINT IF EXISTS "student_sections_section_id_sections_id_fk";
ALTER TABLE "student_sections"
  ADD CONSTRAINT "student_sections_section_id_sections_id_fk"
  FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;

--> statement-breakpoint
-- quizzes.professor_id is RESTRICT — refuse to delete an instructor with
-- live quizzes. Force the admin to reassign or purge the quiz first.
ALTER TABLE "quizzes" DROP CONSTRAINT IF EXISTS "quizzes_professor_id_users_id_fk";
ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_professor_id_users_id_fk"
  FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE "quiz_sections" DROP CONSTRAINT IF EXISTS "quiz_sections_quiz_id_quizzes_id_fk";
ALTER TABLE "quiz_sections"
  ADD CONSTRAINT "quiz_sections_quiz_id_quizzes_id_fk"
  FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE;

ALTER TABLE "quiz_sections" DROP CONSTRAINT IF EXISTS "quiz_sections_section_id_sections_id_fk";
ALTER TABLE "quiz_sections"
  ADD CONSTRAINT "quiz_sections_section_id_sections_id_fk"
  FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;

ALTER TABLE "quiz_sections" DROP CONSTRAINT IF EXISTS "quiz_sections_assigned_by_users_id_fk";
ALTER TABLE "quiz_sections"
  ADD CONSTRAINT "quiz_sections_assigned_by_users_id_fk"
  FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "questions_quiz_id_quizzes_id_fk";
ALTER TABLE "questions"
  ADD CONSTRAINT "questions_quiz_id_quizzes_id_fk"
  FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "assignments_quiz_id_quizzes_id_fk";
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_quiz_id_quizzes_id_fk"
  FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE;

ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "assignments_student_id_users_id_fk";
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_student_id_users_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT IF EXISTS "attempts_assignment_id_assignments_id_fk";
ALTER TABLE "attempts"
  ADD CONSTRAINT "attempts_assignment_id_assignments_id_fk"
  FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;

ALTER TABLE "attempts" DROP CONSTRAINT IF EXISTS "attempts_student_id_users_id_fk";
ALTER TABLE "attempts"
  ADD CONSTRAINT "attempts_student_id_users_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "attempts" DROP CONSTRAINT IF EXISTS "attempts_quiz_id_quizzes_id_fk";
ALTER TABLE "attempts"
  ADD CONSTRAINT "attempts_quiz_id_quizzes_id_fk"
  FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE;

ALTER TABLE "attempts" DROP CONSTRAINT IF EXISTS "attempts_section_id_sections_id_fk";
ALTER TABLE "attempts"
  ADD CONSTRAINT "attempts_section_id_sections_id_fk"
  FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;

--> statement-breakpoint
-- audit_log uses SET NULL — preserve the record when an actor is deleted so
-- past actions remain attributable in metadata even if the row is gone.
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_actor_user_id_fkey";
ALTER TABLE "audit_log"
  ADD CONSTRAINT "audit_log_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;

--> statement-breakpoint
-- 3. Soft-delete columns + active-only partial indexes.
ALTER TABLE "quizzes"  ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
ALTER TABLE "courses"  ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;

CREATE INDEX IF NOT EXISTS "quizzes_active_idx"  ON "quizzes"  ("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "sections_active_idx" ON "sections" ("deleted_at") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "courses_active_idx"  ON "courses"  ("deleted_at") WHERE "deleted_at" IS NULL;

--> statement-breakpoint
-- 4. passingScore on quizzes (Phase C). Default 60% so existing rows get a
-- sensible value without having to backfill explicitly.
ALTER TABLE "quizzes"
  ADD COLUMN IF NOT EXISTS "passing_score" integer NOT NULL DEFAULT 60;
