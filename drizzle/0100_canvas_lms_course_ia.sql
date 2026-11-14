-- Canvas-like course IA: nav config, modules, pages, announcements,
-- peer discussions, assignment groups, outcomes, course rubrics.

--> statement-breakpoint
ALTER TABLE courses ADD COLUMN IF NOT EXISTS lms_navigation jsonb;
--> statement-breakpoint
ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus_markdown text;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  unlock_at timestamptz,
  prerequisite_module_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_modules_course_idx ON course_modules(course_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_modules_tenant_idx ON course_modules(tenant_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS course_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  title text NOT NULL,
  slug text NOT NULL,
  markdown text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS course_pages_course_slug_uidx ON course_pages(course_id, slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_pages_course_idx ON course_pages(course_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS course_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  body_markdown text NOT NULL DEFAULT '',
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_announcements_course_idx ON course_announcements(course_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS peer_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  prompt_markdown text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  assignment_group_id uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS peer_discussions_course_idx ON peer_discussions(course_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS peer_discussion_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES peer_discussions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_post_id uuid,
  body_markdown text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS peer_discussion_posts_discussion_idx ON peer_discussion_posts(discussion_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS assignment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  name text NOT NULL,
  weight integer NOT NULL DEFAULT 0,
  drop_lowest integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignment_groups_course_idx ON assignment_groups(course_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS assignment_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  peer_discussion_id uuid REFERENCES peer_discussions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignment_group_members_group_idx ON assignment_group_members(group_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS assignment_group_members_quiz_uidx ON assignment_group_members(quiz_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  mastery_percent integer NOT NULL DEFAULT 70,
  position integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS learning_outcomes_course_idx ON learning_outcomes(course_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS outcome_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id uuid NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  concept_tag text,
  rubric_criterion_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS outcome_links_outcome_idx ON outcome_links(outcome_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS course_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  title text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_rubrics_course_idx ON course_rubrics(course_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS module_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  is_header boolean NOT NULL DEFAULT false,
  type text NOT NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE SET NULL,
  chatbot_id uuid REFERENCES chatbots(id) ON DELETE SET NULL,
  interactive_id uuid REFERENCES interactives(id) ON DELETE SET NULL,
  page_id uuid REFERENCES course_pages(id) ON DELETE SET NULL,
  peer_discussion_id uuid REFERENCES peer_discussions(id) ON DELETE SET NULL,
  material_id uuid,
  external_url text,
  completion_requirement jsonb,
  published boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS module_items_module_idx ON module_items(module_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS module_items_tenant_idx ON module_items(tenant_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS module_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS module_sections_unique ON module_sections(module_id, section_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS module_sections_section_idx ON module_sections(section_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS module_item_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_item_id uuid NOT NULL REFERENCES module_items(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'STARTED',
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS module_item_progress_unique ON module_item_progress(module_item_id, student_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS module_item_progress_student_idx ON module_item_progress(student_id);

--> statement-breakpoint
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'course_modules','module_items','module_sections','module_item_progress',
    'course_pages','course_announcements','peer_discussions','peer_discussion_posts',
    'assignment_groups','assignment_group_members','learning_outcomes','outcome_links',
    'course_rubrics'
  ];
  pol text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
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
CREATE OR REPLACE FUNCTION sol_list_course_modules(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_rows jsonb;
BEGIN
  IF p_course_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.position, m.created_at), '[]'::jsonb)
  INTO v_rows
  FROM course_modules m
  WHERE m.course_id = p_course_id AND m.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_module_items(p_module_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_rows jsonb;
BEGIN
  IF p_module_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT tenant_id INTO v_tenant FROM course_modules WHERE id = p_module_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.position, i.created_at), '[]'::jsonb)
  INTO v_rows
  FROM module_items i
  WHERE i.module_id = p_module_id AND i.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_course_module(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_row course_modules%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  IF v_id IS NULL THEN
    INSERT INTO course_modules (
      course_id, tenant_id, title, position, published, unlock_at, prerequisite_module_ids
    ) VALUES (
      v_course,
      v_tenant,
      coalesce(p_payload->>'title', 'Module'),
      coalesce((p_payload->>'position')::int, 0),
      coalesce((p_payload->>'published')::boolean, false),
      NULLIF(p_payload->>'unlockAt', '')::timestamptz,
      coalesce(p_payload->'prerequisiteModuleIds', '[]'::jsonb)
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE course_modules SET
      title = coalesce(p_payload->>'title', title),
      position = coalesce((p_payload->>'position')::int, position),
      published = coalesce((p_payload->>'published')::boolean, published),
      unlock_at = CASE WHEN p_payload ? 'unlockAt'
        THEN NULLIF(p_payload->>'unlockAt', '')::timestamptz ELSE unlock_at END,
      prerequisite_module_ids = coalesce(p_payload->'prerequisiteModuleIds', prerequisite_module_ids),
      updated_at = now()
    WHERE id = v_id AND course_id = v_course AND deleted_at IS NULL
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_module_item(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_module uuid := (p_payload->>'moduleId')::uuid;
  v_tenant uuid;
  v_row module_items%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM course_modules WHERE id = v_module AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'module_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  IF v_id IS NULL THEN
    INSERT INTO module_items (
      module_id, tenant_id, position, title, is_header, type,
      lesson_id, quiz_id, chatbot_id, interactive_id, page_id, peer_discussion_id,
      material_id, external_url, completion_requirement, published
    ) VALUES (
      v_module,
      v_tenant,
      coalesce((p_payload->>'position')::int, 0),
      coalesce(p_payload->>'title', 'Item'),
      coalesce((p_payload->>'isHeader')::boolean, false),
      coalesce(p_payload->>'type', 'HEADER'),
      NULLIF(p_payload->>'lessonId', '')::uuid,
      NULLIF(p_payload->>'quizId', '')::uuid,
      NULLIF(p_payload->>'chatbotId', '')::uuid,
      NULLIF(p_payload->>'interactiveId', '')::uuid,
      NULLIF(p_payload->>'pageId', '')::uuid,
      NULLIF(p_payload->>'peerDiscussionId', '')::uuid,
      NULLIF(p_payload->>'materialId', '')::uuid,
      NULLIF(p_payload->>'externalUrl', ''),
      p_payload->'completionRequirement',
      coalesce((p_payload->>'published')::boolean, true)
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE module_items SET
      title = coalesce(p_payload->>'title', title),
      position = coalesce((p_payload->>'position')::int, position),
      is_header = coalesce((p_payload->>'isHeader')::boolean, is_header),
      type = coalesce(p_payload->>'type', type),
      completion_requirement = CASE WHEN p_payload ? 'completionRequirement'
        THEN p_payload->'completionRequirement' ELSE completion_requirement END,
      published = coalesce((p_payload->>'published')::boolean, published),
      updated_at = now()
    WHERE id = v_id AND module_id = v_module AND deleted_at IS NULL
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_assign_module_sections(p_module_id uuid, p_section_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_sid uuid;
  v_count int := 0;
BEGIN
  SELECT tenant_id INTO v_tenant FROM course_modules WHERE id = p_module_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN 0; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOREACH v_sid IN ARRAY coalesce(p_section_ids, ARRAY[]::uuid[]) LOOP
    INSERT INTO module_sections (module_id, section_id, tenant_id)
    VALUES (p_module_id, v_sid, v_tenant)
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_get_course_lms_nav(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_nav jsonb;
  v_syllabus text;
BEGIN
  SELECT tenant_id, lms_navigation, syllabus_markdown
  INTO v_tenant, v_nav, v_syllabus
  FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN NULL; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  RETURN jsonb_build_object(
    'navigation', v_nav,
    'syllabusMarkdown', v_syllabus,
    'tenantId', v_tenant
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_update_course_lms_settings(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_nav jsonb;
  v_syllabus text;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE courses SET
    lms_navigation = CASE WHEN p_payload ? 'navigation'
      THEN p_payload->'navigation' ELSE lms_navigation END,
    syllabus_markdown = CASE WHEN p_payload ? 'syllabusMarkdown'
      THEN p_payload->>'syllabusMarkdown' ELSE syllabus_markdown END,
    updated_at = now()
  WHERE id = v_course
  RETURNING lms_navigation, syllabus_markdown INTO v_nav, v_syllabus;

  RETURN jsonb_build_object('navigation', v_nav, 'syllabusMarkdown', v_syllabus);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_course_pages(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_rows jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.position, p.created_at), '[]'::jsonb)
  INTO v_rows FROM course_pages p WHERE p.course_id = p_course_id AND p.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_course_page(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_row course_pages%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  IF v_id IS NULL THEN
    INSERT INTO course_pages (course_id, tenant_id, title, slug, markdown, published, position)
    VALUES (
      v_course, v_tenant,
      coalesce(p_payload->>'title', 'Page'),
      coalesce(p_payload->>'slug', 'page-' || substr(gen_random_uuid()::text, 1, 8)),
      coalesce(p_payload->>'markdown', ''),
      coalesce((p_payload->>'published')::boolean, false),
      coalesce((p_payload->>'position')::int, 0)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE course_pages SET
      title = coalesce(p_payload->>'title', title),
      slug = coalesce(p_payload->>'slug', slug),
      markdown = coalesce(p_payload->>'markdown', markdown),
      published = coalesce((p_payload->>'published')::boolean, published),
      position = coalesce((p_payload->>'position')::int, position),
      updated_at = now()
    WHERE id = v_id AND course_id = v_course AND deleted_at IS NULL
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_course_announcements(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_rows jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC), '[]'::jsonb)
  INTO v_rows FROM course_announcements a WHERE a.course_id = p_course_id AND a.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_create_course_announcement(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_row course_announcements%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  INSERT INTO course_announcements (
    course_id, tenant_id, author_user_id, title, body_markdown, published_at
  ) VALUES (
    v_course, v_tenant,
    (p_payload->>'authorUserId')::uuid,
    coalesce(p_payload->>'title', 'Announcement'),
    coalesce(p_payload->>'bodyMarkdown', ''),
    CASE WHEN coalesce((p_payload->>'publish')::boolean, true)
      THEN now() ELSE NULL END
  ) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_peer_discussions(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_rows jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC), '[]'::jsonb)
  INTO v_rows FROM peer_discussions d WHERE d.course_id = p_course_id AND d.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_peer_discussion(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_row peer_discussions%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  IF v_id IS NULL THEN
    INSERT INTO peer_discussions (
      course_id, tenant_id, created_by_user_id, title, prompt_markdown, published
    ) VALUES (
      v_course, v_tenant,
      (p_payload->>'createdByUserId')::uuid,
      coalesce(p_payload->>'title', 'Discussion'),
      coalesce(p_payload->>'promptMarkdown', ''),
      coalesce((p_payload->>'published')::boolean, false)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE peer_discussions SET
      title = coalesce(p_payload->>'title', title),
      prompt_markdown = coalesce(p_payload->>'promptMarkdown', prompt_markdown),
      published = coalesce((p_payload->>'published')::boolean, published),
      updated_at = now()
    WHERE id = v_id AND course_id = v_course AND deleted_at IS NULL
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_assignment_groups(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_rows jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY g.position, g.created_at), '[]'::jsonb)
  INTO v_rows FROM assignment_groups g WHERE g.course_id = p_course_id AND g.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_assignment_group(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_row assignment_groups%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  IF v_id IS NULL THEN
    INSERT INTO assignment_groups (course_id, tenant_id, name, weight, drop_lowest, position)
    VALUES (
      v_course, v_tenant,
      coalesce(p_payload->>'name', 'Assignments'),
      coalesce((p_payload->>'weight')::int, 0),
      coalesce((p_payload->>'dropLowest')::int, 0),
      coalesce((p_payload->>'position')::int, 0)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE assignment_groups SET
      name = coalesce(p_payload->>'name', name),
      weight = coalesce((p_payload->>'weight')::int, weight),
      drop_lowest = coalesce((p_payload->>'dropLowest')::int, drop_lowest),
      position = coalesce((p_payload->>'position')::int, position),
      updated_at = now()
    WHERE id = v_id AND course_id = v_course AND deleted_at IS NULL
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_learning_outcomes(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_rows jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.position, o.created_at), '[]'::jsonb)
  INTO v_rows FROM learning_outcomes o WHERE o.course_id = p_course_id AND o.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_learning_outcome(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_row learning_outcomes%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  IF v_id IS NULL THEN
    INSERT INTO learning_outcomes (course_id, tenant_id, title, description, mastery_percent, position)
    VALUES (
      v_course, v_tenant,
      coalesce(p_payload->>'title', 'Outcome'),
      p_payload->>'description',
      coalesce((p_payload->>'masteryPercent')::int, 70),
      coalesce((p_payload->>'position')::int, 0)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE learning_outcomes SET
      title = coalesce(p_payload->>'title', title),
      description = coalesce(p_payload->>'description', description),
      mastery_percent = coalesce((p_payload->>'masteryPercent')::int, mastery_percent),
      position = coalesce((p_payload->>'position')::int, position),
      updated_at = now()
    WHERE id = v_id AND course_id = v_course AND deleted_at IS NULL
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_course_rubrics(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_rows jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = p_course_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
  INTO v_rows FROM course_rubrics r WHERE r.course_id = p_course_id AND r.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_course_rubric(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_row course_rubrics%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM courses WHERE id = v_course AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  IF v_id IS NULL THEN
    INSERT INTO course_rubrics (course_id, tenant_id, title, criteria)
    VALUES (
      v_course, v_tenant,
      coalesce(p_payload->>'title', 'Rubric'),
      coalesce(p_payload->'criteria', '[]'::jsonb)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE course_rubrics SET
      title = coalesce(p_payload->>'title', title),
      criteria = coalesce(p_payload->'criteria', criteria),
      updated_at = now()
    WHERE id = v_id AND course_id = v_course AND deleted_at IS NULL
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_complete_module_item(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item uuid := (p_payload->>'moduleItemId')::uuid;
  v_student uuid := (p_payload->>'studentId')::uuid;
  v_tenant uuid;
  v_row module_item_progress%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM module_items WHERE id = v_item AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'item_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  INSERT INTO module_item_progress (module_item_id, student_id, tenant_id, status, completed_at)
  VALUES (v_item, v_student, v_tenant, 'COMPLETED', now())
  ON CONFLICT (module_item_id, student_id) DO UPDATE SET
    status = 'COMPLETED',
    completed_at = coalesce(module_item_progress.completed_at, now()),
    updated_at = now()
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_module_item_progress(p_student_id uuid, p_module_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_rows jsonb;
BEGIN
  IF p_module_ids IS NULL OR array_length(p_module_ids, 1) IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT tenant_id INTO v_tenant FROM course_modules WHERE id = p_module_ids[1] AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO v_rows
  FROM module_item_progress p
  JOIN module_items i ON i.id = p.module_item_id
  WHERE p.student_id = p_student_id
    AND i.module_id = ANY(p_module_ids)
    AND i.deleted_at IS NULL;
  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_backfill_modules_from_outline(p_outline_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course uuid;
  v_tenant uuid;
  v_omod record;
  v_omodule uuid;
  v_item record;
  v_created int := 0;
BEGIN
  SELECT course_id, tenant_id INTO v_course, v_tenant
  FROM course_outlines WHERE id = p_outline_id AND deleted_at IS NULL;
  IF v_course IS NULL THEN RAISE EXCEPTION 'outline_not_found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOR v_omod IN
    SELECT * FROM outline_modules
    WHERE outline_id = p_outline_id AND deleted_at IS NULL
    ORDER BY position
  LOOP
    INSERT INTO course_modules (course_id, tenant_id, title, position, published)
    VALUES (v_course, v_tenant, v_omod.title, v_omod.position, false)
    RETURNING id INTO v_omodule;
    v_created := v_created + 1;

    FOR v_item IN
      SELECT * FROM outline_items
      WHERE module_id = v_omod.id AND deleted_at IS NULL
      ORDER BY position
    LOOP
      INSERT INTO module_items (
        module_id, tenant_id, position, title, is_header, type,
        lesson_id, quiz_id, chatbot_id, interactive_id, published
      ) VALUES (
        v_omodule, v_tenant, v_item.position, v_item.title, false,
        CASE v_item.type
          WHEN 'DISCUSSION' THEN 'TUTOR'
          ELSE v_item.type
        END,
        v_item.published_lesson_id,
        v_item.published_quiz_id,
        v_item.published_chatbot_id,
        v_item.published_interactive_id,
        false
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('modulesCreated', v_created, 'courseId', v_course);
END;
$$;

--> statement-breakpoint
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'sol_list_course_modules(uuid)',
    'sol_list_module_items(uuid)',
    'sol_upsert_course_module(jsonb)',
    'sol_upsert_module_item(jsonb)',
    'sol_assign_module_sections(uuid,uuid[])',
    'sol_get_course_lms_nav(uuid)',
    'sol_update_course_lms_settings(jsonb)',
    'sol_list_course_pages(uuid)',
    'sol_upsert_course_page(jsonb)',
    'sol_list_course_announcements(uuid)',
    'sol_create_course_announcement(jsonb)',
    'sol_list_peer_discussions(uuid)',
    'sol_upsert_peer_discussion(jsonb)',
    'sol_list_assignment_groups(uuid)',
    'sol_upsert_assignment_group(jsonb)',
    'sol_list_learning_outcomes(uuid)',
    'sol_upsert_learning_outcome(jsonb)',
    'sol_list_course_rubrics(uuid)',
    'sol_upsert_course_rubric(jsonb)',
    'sol_complete_module_item(jsonb)',
    'sol_list_module_item_progress(uuid,uuid[])',
    'sol_backfill_modules_from_outline(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO sol_app', fn);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner')
       AND pg_has_role(current_user, 'neondb_owner', 'member') THEN
      EXECUTE format('ALTER FUNCTION %s OWNER TO neondb_owner', fn);
    END IF;
  END LOOP;
END $$;
