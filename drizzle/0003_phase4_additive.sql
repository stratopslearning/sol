-- Phase 4 — additive schema migration.
--
-- All changes here are additive (new columns / new tables / new indexes).
-- No destructive ALTERs — those are deferred to Phase 6 in a separate PR.
--
-- IMPORTANT: run drizzle/preflight_phase4_duplicate_scan.sql first to confirm
-- the existing data does not already violate the unique constraints we are
-- about to add. Any duplicate rows will cause the matching CREATE UNIQUE
-- INDEX statement to fail.

--> statement-breakpoint
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text,
  ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" text NOT NULL,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp,
  CONSTRAINT "stripe_events_event_id_unique" UNIQUE("event_id")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id"),
  "actor_clerk_id" text,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "metadata" jsonb,
  "ip" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Composite unique constraints. Use CONCURRENTLY when running on a busy
-- production DB to avoid table locks. (Drizzle migrations execute statements
-- in a transaction by default; if you want CONCURRENTLY, run these manually
-- outside the transaction.)
CREATE UNIQUE INDEX IF NOT EXISTS "professor_sections_unique"
  ON "professor_sections" ("professor_id", "section_id");

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "student_sections_unique"
  ON "student_sections" ("student_id", "section_id");

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_sections_unique"
  ON "quiz_sections" ("quiz_id", "section_id");

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_quiz_student_unique"
  ON "assignments" ("quiz_id", "student_id");

--> statement-breakpoint
-- Hot-path FK indexes. PostgreSQL does not auto-index foreign-key columns,
-- so common JOINs / WHEREs against these columns end up doing seq scans.
CREATE INDEX IF NOT EXISTS "sections_course_idx"        ON "sections"          ("course_id");
CREATE INDEX IF NOT EXISTS "quizzes_professor_idx"      ON "quizzes"           ("professor_id");
CREATE INDEX IF NOT EXISTS "questions_quiz_idx"         ON "questions"         ("quiz_id");
CREATE INDEX IF NOT EXISTS "assignments_student_idx"    ON "assignments"       ("student_id");
CREATE INDEX IF NOT EXISTS "professor_sections_section_idx"
  ON "professor_sections" ("section_id");
CREATE INDEX IF NOT EXISTS "student_sections_section_idx"
  ON "student_sections"   ("section_id");
CREATE INDEX IF NOT EXISTS "quiz_sections_section_idx"  ON "quiz_sections"     ("section_id");
CREATE INDEX IF NOT EXISTS "attempts_assignment_idx"    ON "attempts"          ("assignment_id");
CREATE INDEX IF NOT EXISTS "attempts_student_idx"       ON "attempts"          ("student_id");
CREATE INDEX IF NOT EXISTS "attempts_quiz_idx"          ON "attempts"          ("quiz_id");
CREATE INDEX IF NOT EXISTS "attempts_section_idx"       ON "attempts"          ("section_id");
CREATE INDEX IF NOT EXISTS "audit_log_created_idx"      ON "audit_log"         ("created_at");
CREATE INDEX IF NOT EXISTS "audit_log_actor_idx"        ON "audit_log"         ("actor_user_id");
