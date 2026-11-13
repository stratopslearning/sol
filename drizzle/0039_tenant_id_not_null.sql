-- Wave A: close tenant_id contract (expand → NOT NULL).
-- courses / lti_platforms get tenant_id (= workspace_id). Quarantine NULL orphans.

--> statement-breakpoint
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tenant_id uuid;
--> statement-breakpoint
UPDATE courses SET tenant_id = workspace_id WHERE tenant_id IS NULL;
--> statement-breakpoint
ALTER TABLE courses ALTER COLUMN tenant_id SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE courses
    ADD CONSTRAINT courses_tenant_id_workspaces_id_fk
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS courses_tenant_idx ON courses (tenant_id);

--> statement-breakpoint
ALTER TABLE lti_platforms ADD COLUMN IF NOT EXISTS tenant_id uuid;
--> statement-breakpoint
UPDATE lti_platforms SET tenant_id = workspace_id WHERE tenant_id IS NULL;
--> statement-breakpoint
ALTER TABLE lti_platforms ALTER COLUMN tenant_id SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE lti_platforms
    ADD CONSTRAINT lti_platforms_tenant_id_workspaces_id_fk
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lti_platforms_tenant_idx ON lti_platforms (tenant_id);

--> statement-breakpoint
-- Quarantine template / orphan rows onto default workspace before NOT NULL.
UPDATE chatbots
SET tenant_id = '00000000-0000-4000-8000-000000000001'
WHERE tenant_id IS NULL;
--> statement-breakpoint
UPDATE course_activities
SET tenant_id = '00000000-0000-4000-8000-000000000001'
WHERE tenant_id IS NULL;

--> statement-breakpoint
-- Enforce NOT NULL on teaching inventory (idempotent where already set).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'sections','quizzes','quiz_sections','questions','assignments','attempts',
    'grading_cache','chatbots','chatbot_sections','chatbot_assignments','chatbot_sessions',
    'professor_sections','student_sections','course_materials','course_material_chunks',
    'lessons','lesson_sections','flashcards','lesson_progress','interactives',
    'interactive_sections','interactive_progress','course_activities','course_outlines',
    'outline_modules','outline_items','authoring_revisions','authoring_messages',
    'course_knowledge_links','hosted_books','book_chapters','book_sections',
    'lti_deployments','lti_section_links','lti_user_links','lti_line_items','lti_passback_jobs',
    'course_offerings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
        AND is_nullable = 'YES'
    ) THEN
      EXECUTE format(
        'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL',
        t,
        '00000000-0000-4000-8000-000000000001'
      );
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);
    END IF;
  END LOOP;
END $$;

--> statement-breakpoint
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS tenant_id uuid;
--> statement-breakpoint
UPDATE knowledge_documents SET tenant_id = workspace_id WHERE tenant_id IS NULL;
--> statement-breakpoint
ALTER TABLE knowledge_documents ALTER COLUMN tenant_id SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS knowledge_documents_tenant_idx ON knowledge_documents (tenant_id);

--> statement-breakpoint
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS tenant_id uuid;
--> statement-breakpoint
UPDATE knowledge_chunks SET tenant_id = workspace_id WHERE tenant_id IS NULL;
--> statement-breakpoint
ALTER TABLE knowledge_chunks ALTER COLUMN tenant_id SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS knowledge_chunks_tenant_idx ON knowledge_chunks (tenant_id);
