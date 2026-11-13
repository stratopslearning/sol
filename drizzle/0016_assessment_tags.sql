-- Assessment: concept tags on questions + Authoring provenance on quizzes.
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "source_outline_item_id" uuid;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "concept_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
