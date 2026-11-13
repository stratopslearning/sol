-- Shah-style interactive chapters on lessons + practice section-check progress.

--> statement-breakpoint
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS chapter jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS interactive_chapter_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES workspaces(id) ON DELETE RESTRICT,
  section_id text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  last_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS interactive_chapter_progress_unique
  ON interactive_chapter_progress(lesson_id, student_id, section_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS interactive_chapter_progress_student_idx
  ON interactive_chapter_progress(student_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS interactive_chapter_progress_lesson_idx
  ON interactive_chapter_progress(lesson_id);

--> statement-breakpoint
ALTER TABLE interactive_chapter_progress ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE interactive_chapter_progress FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS interactive_chapter_progress_tenant ON interactive_chapter_progress;
--> statement-breakpoint
CREATE POLICY interactive_chapter_progress_tenant ON interactive_chapter_progress
  FOR ALL
  USING (
    tenant_id IS NULL
    OR tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
  )
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
  );

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_create_lesson(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_professor uuid := (p_payload->>'professorId')::uuid;
  v_tenant uuid;
  v_offering uuid;
  v_id uuid;
  v_card jsonb;
  v_pos int := 0;
BEGIN
  IF v_course IS NULL OR v_professor IS NULL THEN
    RAISE EXCEPTION 'courseId and professorId required';
  END IF;
  SELECT COALESCE(c.tenant_id, c.workspace_id),
         sol_default_offering_for_course(c.id)
  INTO v_tenant, v_offering
  FROM courses c WHERE c.id = v_course AND c.deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Course not found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  INSERT INTO lessons (
    professor_id, course_id, tenant_id, offering_id, title, markdown, chapter,
    is_active, source_outline_item_id
  ) VALUES (
    v_professor, v_course, v_tenant, v_offering,
    COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled lesson'),
    COALESCE(p_payload->>'markdown', ''),
    CASE
      WHEN p_payload ? 'chapter' AND p_payload->'chapter' IS NOT NULL
           AND jsonb_typeof(p_payload->'chapter') = 'object'
        THEN p_payload->'chapter'
      ELSE NULL
    END,
    COALESCE((p_payload->>'isActive')::boolean, false),
    NULLIF(p_payload->>'sourceOutlineItemId', '')::uuid
  )
  RETURNING id INTO v_id;

  FOR v_card IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'flashcards', '[]'::jsonb))
  LOOP
    IF NULLIF(trim(v_card->>'front'), '') IS NULL
       OR NULLIF(trim(v_card->>'back'), '') IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO flashcards (lesson_id, tenant_id, front, back, position)
    VALUES (
      v_id, v_tenant,
      trim(v_card->>'front'), trim(v_card->>'back'), v_pos
    );
    v_pos := v_pos + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_id,
    'title', COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled lesson'),
    'courseId', v_course,
    'professorId', v_professor,
    'isActive', COALESCE((p_payload->>'isActive')::boolean, false),
    'sourceOutlineItemId', NULLIF(p_payload->>'sourceOutlineItemId', '')::uuid
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_chapter_section_progress(
  p_lesson_id uuid,
  p_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_rows jsonb;
BEGIN
  IF p_lesson_id IS NULL OR p_student_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT COALESCE(l.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM lessons l
  JOIN courses c ON c.id = l.course_id
  WHERE l.id = p_lesson_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.section_id), '[]'::jsonb)
  INTO v_rows
  FROM interactive_chapter_progress p
  WHERE p.lesson_id = p_lesson_id AND p.student_id = p_student_id;

  RETURN v_rows;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_chapter_section_progress(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson uuid := (p_payload->>'lessonId')::uuid;
  v_student uuid := (p_payload->>'studentId')::uuid;
  v_section text := NULLIF(trim(p_payload->>'sectionId'), '');
  v_passed boolean := COALESCE((p_payload->>'passed')::boolean, false);
  v_tenant uuid;
  v_row interactive_chapter_progress%ROWTYPE;
BEGIN
  IF v_lesson IS NULL OR v_student IS NULL OR v_section IS NULL THEN
    RAISE EXCEPTION 'lessonId, studentId, and sectionId required';
  END IF;
  SELECT COALESCE(l.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM lessons l
  JOIN courses c ON c.id = l.course_id
  WHERE l.id = v_lesson AND l.deleted_at IS NULL;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Lesson not found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  INSERT INTO interactive_chapter_progress (
    lesson_id, student_id, tenant_id, section_id, attempts, passed, last_submitted_at, updated_at
  ) VALUES (
    v_lesson, v_student, v_tenant, v_section, 1, v_passed, now(), now()
  )
  ON CONFLICT (lesson_id, student_id, section_id) DO UPDATE SET
    attempts = interactive_chapter_progress.attempts + 1,
    passed = interactive_chapter_progress.passed OR EXCLUDED.passed,
    last_submitted_at = now(),
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'sol_create_lesson(jsonb)',
    'sol_list_chapter_section_progress(uuid,uuid)',
    'sol_upsert_chapter_section_progress(jsonb)'
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
