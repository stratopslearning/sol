-- AI prompts v2: course subject/level/tone + rubric approval backfill.
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "subject" text DEFAULT 'General' NOT NULL;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "level" text DEFAULT 'undergraduate' NOT NULL;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "feedback_tone" text DEFAULT 'supportive' NOT NULL;

-- Existing non-null rubrics were used in production; treat as instructor-approved.
UPDATE "questions"
SET "rubric_status" = 'approved'
WHERE "rubric" IS NOT NULL
  AND "rubric_status" IN ('none', 'proposed');
