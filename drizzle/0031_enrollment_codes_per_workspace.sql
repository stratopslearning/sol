ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;--> statement-breakpoint
UPDATE "sections" s
SET "workspace_id" = c."workspace_id"
FROM "courses" c
WHERE s."course_id" = c."id"
  AND s."workspace_id" IS NULL;--> statement-breakpoint
ALTER TABLE "sections" DROP CONSTRAINT IF EXISTS "sections_professor_enrollment_code_unique";--> statement-breakpoint
ALTER TABLE "sections" DROP CONSTRAINT IF EXISTS "sections_student_enrollment_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sections_workspace_prof_enrollment_code_uidx"
  ON "sections" ("workspace_id", "professor_enrollment_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sections_workspace_stud_enrollment_code_uidx"
  ON "sections" ("workspace_id", "student_enrollment_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sections_workspace_idx" ON "sections" ("workspace_id");
