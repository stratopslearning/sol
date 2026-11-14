-- Composite index for gradebook / results / analytics hot path.
CREATE INDEX IF NOT EXISTS "attempts_section_quiz_submitted_idx"
  ON "attempts" ("section_id", "quiz_id", "submitted_at" DESC)
  WHERE "submitted_at" IS NOT NULL;

--> statement-breakpoint
-- Refund / dispute lookup by Stripe customer id.
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_customer_id_unique"
  ON "users" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;

--> statement-breakpoint
-- One in-progress chatbot session per assignment (mirrors attempts open unique).
DELETE FROM "chatbot_sessions" a
USING "chatbot_sessions" b
WHERE a.status = 'in_progress'
  AND b.status = 'in_progress'
  AND a.assignment_id = b.assignment_id
  AND a.started_at < b.started_at;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chatbot_sessions_one_open_per_assignment_idx"
  ON "chatbot_sessions" ("assignment_id")
  WHERE "status" = 'in_progress';
