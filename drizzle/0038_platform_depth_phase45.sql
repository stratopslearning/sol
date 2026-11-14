CREATE TABLE IF NOT EXISTS "quiz_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quiz_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  CONSTRAINT "quiz_versions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE,
  CONSTRAINT "quiz_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_versions_quiz_version_uidx"
  ON "quiz_versions" ("quiz_id", "version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_versions_quiz_idx"
  ON "quiz_versions" ("quiz_id");--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "quiz_version_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attempts_quiz_version_id_fkey'
  ) THEN
    ALTER TABLE "attempts"
      ADD CONSTRAINT "attempts_quiz_version_id_fkey"
      FOREIGN KEY ("quiz_version_id") REFERENCES "quiz_versions"("id") ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_rollups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "offering_id" uuid,
  "section_id" uuid,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "computed_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "analytics_rollups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "analytics_rollups_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE CASCADE,
  CONSTRAINT "analytics_rollups_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_rollups_scope_kind_uidx"
  ON "analytics_rollups" ("tenant_id", "offering_id", "section_id", "kind") NULLS NOT DISTINCT;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_rollups_tenant_kind_idx"
  ON "analytics_rollups" ("tenant_id", "kind", "computed_at" DESC);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regrade_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "note" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "resolved_at" timestamptz,
  CONSTRAINT "regrade_requests_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE,
  CONSTRAINT "regrade_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "regrade_requests_status_check" CHECK ("status" IN ('open', 'resolved'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regrade_requests_status_idx"
  ON "regrade_requests" ("status", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regrade_requests_attempt_idx"
  ON "regrade_requests" ("attempt_id");--> statement-breakpoint
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "ai_policy" jsonb;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "ai_policy" jsonb;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD COLUMN IF NOT EXISTS "session_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_tenant_id_fkey'
  ) THEN
    ALTER TABLE "audit_log"
      ADD CONSTRAINT "audit_log_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "workspaces"("id") ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_tenant_created_idx"
  ON "audit_log" ("tenant_id", "created_at" DESC);
