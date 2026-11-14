CREATE TABLE IF NOT EXISTS "course_offerings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "tenant_id" uuid,
  "term_label" text DEFAULT 'default' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "course_offerings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "course_offerings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT,
  CONSTRAINT "course_offerings_status_check" CHECK ("status" IN ('draft', 'active', 'ended', 'archived'))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "course_offerings_course_term_uidx"
  ON "course_offerings" ("course_id", "term_label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_offerings_tenant_idx"
  ON "course_offerings" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_offerings_course_idx"
  ON "course_offerings" ("course_id");--> statement-breakpoint
INSERT INTO "course_offerings" ("course_id", "tenant_id", "term_label", "status")
SELECT c."id", c."workspace_id", 'default', 'active'
FROM "courses" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "course_offerings" co
  WHERE co."course_id" = c."id"
    AND co."term_label" = 'default'
);--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
UPDATE "sections" s
SET "offering_id" = co."id"
FROM "course_offerings" co
WHERE co."course_id" = s."course_id"
  AND co."term_label" = 'default'
  AND s."offering_id" IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sections_offering_id_fkey'
  ) THEN
    ALTER TABLE "sections"
      ADD CONSTRAINT "sections_offering_id_fkey"
      FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sections_offering_idx" ON "sections" ("offering_id");
