-- Wave A: fail-closed RLS. Drop empty-GUC bypass; FORCE on teaching tables.
-- Policies compare tenant_id (or workspace_id for membership-scoped tables) to app.tenant_id.

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_tenant_guc() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')
$$;

--> statement-breakpoint
-- Helper: apply FORCE + tenant_id policy for a table that has tenant_id.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'courses','sections','quizzes','quiz_sections','questions','assignments','attempts',
    'grading_cache','chatbots','chatbot_sections','chatbot_assignments','chatbot_sessions',
    'professor_sections','student_sections','course_materials','course_material_chunks',
    'lessons','lesson_sections','flashcards','lesson_progress','interactives',
    'interactive_sections','interactive_progress','course_activities','course_outlines',
    'outline_modules','outline_items','authoring_revisions','authoring_messages',
    'course_knowledge_links','hosted_books','book_chapters','book_sections',
    'lti_platforms','lti_deployments','lti_section_links','lti_user_links',
    'lti_line_items','lti_passback_jobs','course_offerings',
    'knowledge_documents','knowledge_chunks','grants','support_access_grants',
    'grade_overrides','quiz_versions','analytics_rollups','regrade_requests','section_links'
  ];
  pol text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    pol := t || '_tenant_isolation';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (tenant_id::text = sol_tenant_guc()) WITH CHECK (tenant_id::text = sol_tenant_guc())',
      pol, t
    );
  END LOOP;
END $$;

--> statement-breakpoint
-- workspaces: tenant GUC match, or membership for the session user (switcher / Home).
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workspaces_tenant_isolation ON workspaces;
--> statement-breakpoint
CREATE POLICY workspaces_tenant_isolation ON workspaces
  FOR ALL
  USING (
    id::text = sol_tenant_guc()
    OR (
      nullif(current_setting('app.user_id', true), '') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM workspace_memberships m
        WHERE m.workspace_id = workspaces.id
          AND m.user_id::text = current_setting('app.user_id', true)
          AND m.status = 'active'
      )
    )
  )
  WITH CHECK (id::text = sol_tenant_guc());

--> statement-breakpoint
-- Memberships: visible for the active tenant OR rows owned by the session user.
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE workspace_memberships FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workspace_memberships_tenant_isolation ON workspace_memberships;
--> statement-breakpoint
CREATE POLICY workspace_memberships_tenant_isolation ON workspace_memberships
  FOR ALL
  USING (
    workspace_id::text = sol_tenant_guc()
    OR user_id::text = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    workspace_id::text = sol_tenant_guc()
    OR user_id::text = nullif(current_setting('app.user_id', true), '')
  );

--> statement-breakpoint
ALTER TABLE workspace_licenses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE workspace_licenses FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workspace_licenses_tenant_isolation ON workspace_licenses;
--> statement-breakpoint
CREATE POLICY workspace_licenses_tenant_isolation ON workspace_licenses
  FOR ALL
  USING (workspace_id::text = sol_tenant_guc())
  WITH CHECK (workspace_id::text = sol_tenant_guc());

--> statement-breakpoint
ALTER TABLE workspace_usage_daily ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE workspace_usage_daily FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workspace_usage_daily_tenant_isolation ON workspace_usage_daily;
--> statement-breakpoint
CREATE POLICY workspace_usage_daily_tenant_isolation ON workspace_usage_daily
  FOR ALL
  USING (workspace_id::text = sol_tenant_guc())
  WITH CHECK (workspace_id::text = sol_tenant_guc());

--> statement-breakpoint
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE workspace_invites FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workspace_invites_tenant_isolation ON workspace_invites;
--> statement-breakpoint
CREATE POLICY workspace_invites_tenant_isolation ON workspace_invites
  FOR ALL
  USING (workspace_id::text = sol_tenant_guc())
  WITH CHECK (workspace_id::text = sol_tenant_guc());

--> statement-breakpoint
ALTER TABLE authoring_policies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE authoring_policies FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS authoring_policies_tenant_isolation ON authoring_policies;
--> statement-breakpoint
CREATE POLICY authoring_policies_tenant_isolation ON authoring_policies
  FOR ALL
  USING (workspace_id::text = sol_tenant_guc())
  WITH CHECK (workspace_id::text = sol_tenant_guc());

--> statement-breakpoint
-- Grant sol_app DML on any new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sol_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sol_app;
