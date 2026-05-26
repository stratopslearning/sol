-- Phase 5 — grading deterministic redesign (additive only).
--
-- This migration is additive and idempotent. It introduces:
--   1. `questions.rubric` (jsonb) + `questions.rubric_version` (integer) — the
--      per-question deterministic rubric used by the new grader.
--   2. `attempts.grading_status` — coarse top-level state ('complete' |
--      'partial' | 'failed') so the cron worker can find attempts with
--      pending short-answer questions cheaply.
--   3. `grading_cache` — SHA-256 keyed answer cache. Identical resubmissions
--      reuse the previous grade, eliminating "same answer different score"
--      complaints.
--
-- Safe to run on production: every statement uses IF NOT EXISTS / IF EXISTS.

--> statement-breakpoint
ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "rubric" jsonb,
  ADD COLUMN IF NOT EXISTS "rubric_version" integer NOT NULL DEFAULT 1;

--> statement-breakpoint
ALTER TABLE "attempts"
  ADD COLUMN IF NOT EXISTS "grading_status" text;

--> statement-breakpoint
-- Partial index so the cron worker only scans attempts that still have
-- grading work to do. ('complete' is the steady state and excluded.)
CREATE INDEX IF NOT EXISTS "attempts_grading_status_idx"
  ON "attempts" ("grading_status")
  WHERE "grading_status" IS NOT NULL AND "grading_status" <> 'complete';

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grading_cache" (
  "key" text PRIMARY KEY NOT NULL,
  "question_id" uuid NOT NULL,
  "rubric_version" integer NOT NULL,
  "model_version" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "grading_cache_question_id_questions_id_fk"
    FOREIGN KEY ("question_id")
    REFERENCES "questions"("id")
    ON DELETE CASCADE
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grading_cache_question_idx"
  ON "grading_cache" ("question_id");
