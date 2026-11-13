-- Knowledge layers: pinned versions on course links, personal visibility.

ALTER TABLE "course_knowledge_links"
  ADD COLUMN IF NOT EXISTS "pinned_version_id" uuid
    REFERENCES "knowledge_document_versions"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "update_available_version_id" uuid
    REFERENCES "knowledge_document_versions"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "update_noticed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Backfill pins from the document's current version.
UPDATE "course_knowledge_links" AS ckl
SET
  "pinned_version_id" = kd."current_version_id",
  "updated_at" = now()
FROM "knowledge_documents" AS kd
WHERE kd."id" = ckl."document_id"
  AND ckl."pinned_version_id" IS NULL
  AND kd."current_version_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "course_knowledge_links_pinned_version_idx"
  ON "course_knowledge_links" ("pinned_version_id");

ALTER TABLE "knowledge_documents"
  ADD COLUMN IF NOT EXISTS "visibility" text
    DEFAULT 'workspace' NOT NULL;

-- Existing docs stay workspace-shared.
UPDATE "knowledge_documents"
SET "visibility" = 'workspace'
WHERE "visibility" IS NULL OR "visibility" = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'knowledge_documents_visibility_check'
  ) THEN
    ALTER TABLE "knowledge_documents"
      ADD CONSTRAINT "knowledge_documents_visibility_check"
      CHECK ("visibility" IN ('personal', 'workspace'));
  END IF;
END $$;
