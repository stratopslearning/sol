-- One in-progress attempt per assignment (partial unique).
-- Prevents concurrent /start races from creating multiple open attempts.

--> statement-breakpoint
-- Keep the newest open attempt when duplicates already exist.
DELETE FROM "attempts" a
USING "attempts" b
WHERE a.submitted_at IS NULL
  AND b.submitted_at IS NULL
  AND a.assignment_id = b.assignment_id
  AND a.started_at < b.started_at;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attempts_one_open_per_assignment_idx"
  ON "attempts" ("assignment_id")
  WHERE "submitted_at" IS NULL;
