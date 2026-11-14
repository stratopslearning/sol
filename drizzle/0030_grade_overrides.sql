-- Phase 1: instructor grade overrides + quiz grade release timestamp.

--> statement-breakpoint
ALTER TABLE "quizzes"
  ADD COLUMN IF NOT EXISTS "grades_released_at" timestamp with time zone;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grade_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL,
  "question_id" uuid,
  "numeric_score" integer,
  "criteria_overrides" jsonb,
  "note" text NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grade_overrides_attempt_id_attempts_id_fk'
  ) THEN
    ALTER TABLE "grade_overrides"
      ADD CONSTRAINT "grade_overrides_attempt_id_attempts_id_fk"
      FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grade_overrides_question_id_questions_id_fk'
  ) THEN
    ALTER TABLE "grade_overrides"
      ADD CONSTRAINT "grade_overrides_question_id_questions_id_fk"
      FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grade_overrides_actor_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "grade_overrides"
      ADD CONSTRAINT "grade_overrides_actor_user_id_users_id_fk"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grade_overrides_attempt_idx"
  ON "grade_overrides" ("attempt_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grade_overrides_attempt_created_idx"
  ON "grade_overrides" ("attempt_id", "created_at");
