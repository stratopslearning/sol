-- Authoring: prior-course corpus tags, revisions, switch-up lineage, workspace policies.

ALTER TABLE "course_materials"
  ADD COLUMN IF NOT EXISTS "authoring_corpus" text DEFAULT 'this_term' NOT NULL;

ALTER TABLE "course_knowledge_links"
  ADD COLUMN IF NOT EXISTS "authoring_corpus" text DEFAULT 'this_term' NOT NULL;

ALTER TABLE "course_outlines"
  ADD COLUMN IF NOT EXISTS "has_prior_corpus" boolean DEFAULT false NOT NULL;
ALTER TABLE "course_outlines"
  ADD COLUMN IF NOT EXISTS "bodies_built" boolean DEFAULT false NOT NULL;

ALTER TABLE "outline_items"
  ADD COLUMN IF NOT EXISTS "variant_of_item_id" uuid;
ALTER TABLE "outline_items"
  ADD COLUMN IF NOT EXISTS "faithful_body" jsonb;

CREATE TABLE IF NOT EXISTS "authoring_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "outline_id" uuid NOT NULL REFERENCES "course_outlines"("id") ON DELETE cascade,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "label" text NOT NULL,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "authoring_revisions_outline_idx"
  ON "authoring_revisions" ("outline_id");

CREATE TABLE IF NOT EXISTS "authoring_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "structure_notes" text,
  "rubric_style" text,
  "tone" text,
  "extra_prompt" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "authoring_policies_workspace_unique"
  ON "authoring_policies" ("workspace_id");
