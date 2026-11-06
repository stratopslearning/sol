-- Wave 1: faculty writes under FORCE RLS (sol-knowledge-dev).
-- Callers must authorize() in app first. Functions pin app.tenant_id.

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_role_bindings_at_user_scope(
  p_user_id uuid,
  p_scope_type text,
  p_scope_id uuid
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  scope_type text,
  scope_id uuid,
  role text,
  granted_by uuid,
  created_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.tenant_id, b.user_id, b.scope_type::text, b.scope_id,
         b.role::text, b.granted_by, b.created_at, b.revoked_at
  FROM role_bindings b
  WHERE b.user_id = p_user_id
    AND b.scope_type = p_scope_type
    AND b.scope_id = p_scope_id
    AND b.revoked_at IS NULL;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_find_role_binding(
  p_tenant_id uuid,
  p_user_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_role text
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  scope_type text,
  scope_id uuid,
  role text,
  granted_by uuid,
  created_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.tenant_id, b.user_id, b.scope_type::text, b.scope_id,
         b.role::text, b.granted_by, b.created_at, b.revoked_at
  FROM role_bindings b
  WHERE b.tenant_id = p_tenant_id
    AND b.user_id = p_user_id
    AND b.scope_type = p_scope_type
    AND b.scope_id = p_scope_id
    AND b.role = p_role
  LIMIT 1;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_role_binding_by_id(p_binding_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  scope_type text,
  scope_id uuid,
  role text,
  granted_by uuid,
  created_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.tenant_id, b.user_id, b.scope_type::text, b.scope_id,
         b.role::text, b.granted_by, b.created_at, b.revoked_at
  FROM role_bindings b
  WHERE b.id = p_binding_id;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_count_active_owners(p_tenant_id uuid)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT count(*)::int
  FROM role_bindings b
  WHERE b.tenant_id = p_tenant_id
    AND b.scope_type = 'organization'
    AND b.scope_id = p_tenant_id
    AND b.role = 'owner'
    AND b.revoked_at IS NULL;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_active_bindings_for_scope(
  p_tenant_id uuid,
  p_scope_type text,
  p_scope_id uuid
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  scope_type text,
  scope_id uuid,
  role text,
  granted_by uuid,
  created_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT b.id, b.tenant_id, b.user_id, b.scope_type::text, b.scope_id,
         b.role::text, b.granted_by, b.created_at, b.revoked_at
  FROM role_bindings b
  WHERE b.tenant_id = p_tenant_id
    AND b.scope_type = p_scope_type
    AND b.scope_id = p_scope_id
    AND b.revoked_at IS NULL;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_role_binding(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_user uuid := (p_payload->>'userId')::uuid;
  v_scope_type text := p_payload->>'scopeType';
  v_scope_id uuid := (p_payload->>'scopeId')::uuid;
  v_role text := p_payload->>'role';
  v_granted_by uuid := NULLIF(p_payload->>'grantedBy', '')::uuid;
  v_id uuid;
  v_revoked timestamptz;
BEGIN
  IF v_tenant IS NULL OR v_user IS NULL OR v_scope_type IS NULL
     OR v_scope_id IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'tenantId, userId, scopeType, scopeId, role required';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT b.id, b.revoked_at INTO v_id, v_revoked
  FROM role_bindings b
  WHERE b.tenant_id = v_tenant
    AND b.user_id = v_user
    AND b.scope_type = v_scope_type
    AND b.scope_id = v_scope_id
    AND b.role = v_role
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    IF v_revoked IS NOT NULL THEN
      UPDATE role_bindings
      SET revoked_at = NULL,
          granted_by = COALESCE(v_granted_by, granted_by)
      WHERE id = v_id;
    END IF;
    RETURN jsonb_build_object('bindingId', v_id, 'created', false);
  END IF;

  INSERT INTO role_bindings (
    tenant_id, user_id, scope_type, scope_id, role, granted_by
  ) VALUES (
    v_tenant, v_user, v_scope_type, v_scope_id, v_role, v_granted_by
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('bindingId', v_id, 'created', true);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_revoke_role_binding(p_binding_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_role text;
  v_scope_type text;
  v_revoked timestamptz;
  v_owners int;
BEGIN
  SELECT tenant_id, role::text, scope_type::text, revoked_at
  INTO v_tenant, v_role, v_scope_type, v_revoked
  FROM role_bindings
  WHERE id = p_binding_id;

  IF NOT FOUND OR v_revoked IS NOT NULL THEN
    RETURN;
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  IF v_role = 'owner' AND v_scope_type = 'organization' THEN
    SELECT count(*)::int INTO v_owners
    FROM role_bindings
    WHERE tenant_id = v_tenant
      AND scope_type = 'organization'
      AND scope_id = v_tenant
      AND role = 'owner'
      AND revoked_at IS NULL;
    IF v_owners <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last workspace owner';
    END IF;
  END IF;

  UPDATE role_bindings
  SET revoked_at = now()
  WHERE id = p_binding_id AND revoked_at IS NULL;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_ensure_offering(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_term text := COALESCE(NULLIF(trim(p_payload->>'termLabel'), ''), 'default');
  v_status text := COALESCE(NULLIF(p_payload->>'status', ''), 'active');
  v_starts timestamptz := NULLIF(p_payload->>'startsAt', '')::timestamptz;
  v_ends timestamptz := NULLIF(p_payload->>'endsAt', '')::timestamptz;
  v_course_tenant uuid;
  v_row course_offerings%ROWTYPE;
BEGIN
  IF v_course IS NULL THEN
    RAISE EXCEPTION 'courseId required';
  END IF;

  SELECT COALESCE(c.tenant_id, c.workspace_id) INTO v_course_tenant
  FROM courses c
  WHERE c.id = v_course AND c.deleted_at IS NULL;
  IF v_course_tenant IS NULL THEN
    RAISE EXCEPTION 'Course not found: %', v_course;
  END IF;

  IF v_tenant IS NOT NULL AND v_tenant IS DISTINCT FROM v_course_tenant THEN
    RAISE EXCEPTION 'tenantId does not match course';
  END IF;
  v_tenant := v_course_tenant;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT * INTO v_row
  FROM course_offerings o
  WHERE o.course_id = v_course AND o.term_label = v_term
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_row.id,
      'courseId', v_row.course_id,
      'tenantId', v_row.tenant_id,
      'termLabel', v_row.term_label,
      'status', v_row.status,
      'startsAt', v_row.starts_at,
      'endsAt', v_row.ends_at
    );
  END IF;

  INSERT INTO course_offerings (
    course_id, tenant_id, term_label, status, starts_at, ends_at
  ) VALUES (
    v_course, v_tenant, v_term, v_status, v_starts, v_ends
  )
  ON CONFLICT (course_id, term_label) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row
    FROM course_offerings o
    WHERE o.course_id = v_course AND o.term_label = v_term
    LIMIT 1;
  END IF;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Failed to ensure offering';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'courseId', v_row.course_id,
    'tenantId', v_row.tenant_id,
    'termLabel', v_row.term_label,
    'status', v_row.status,
    'startsAt', v_row.starts_at,
    'endsAt', v_row.ends_at
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_sync_course_activity(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := p_payload->>'type';
  v_quiz uuid := NULLIF(p_payload->>'quizId', '')::uuid;
  v_lesson uuid := NULLIF(p_payload->>'lessonId', '')::uuid;
  v_chatbot uuid := NULLIF(p_payload->>'chatbotId', '')::uuid;
  v_interactive uuid := NULLIF(p_payload->>'interactiveId', '')::uuid;
  v_course uuid := NULLIF(p_payload->>'courseId', '')::uuid;
  v_professor uuid := (p_payload->>'professorId')::uuid;
  v_tenant uuid;
  v_id uuid;
  v_row course_activities%ROWTYPE;
BEGIN
  IF v_professor IS NULL OR v_type IS NULL THEN
    RAISE EXCEPTION 'professorId and type required';
  END IF;

  IF v_course IS NOT NULL THEN
    SELECT COALESCE(c.tenant_id, c.workspace_id) INTO v_tenant
    FROM courses c WHERE c.id = v_course;
  END IF;
  IF v_tenant IS NULL AND v_quiz IS NOT NULL THEN
    SELECT q.tenant_id INTO v_tenant FROM quizzes q WHERE q.id = v_quiz;
  END IF;
  IF v_tenant IS NULL AND v_chatbot IS NOT NULL THEN
    SELECT cb.tenant_id INTO v_tenant FROM chatbots cb WHERE cb.id = v_chatbot;
  END IF;
  IF v_tenant IS NULL THEN
    v_tenant := NULLIF(p_payload->>'tenantId', '')::uuid;
  END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  IF v_quiz IS NOT NULL THEN
    SELECT id INTO v_id FROM course_activities WHERE quiz_id = v_quiz LIMIT 1;
  ELSIF v_lesson IS NOT NULL THEN
    SELECT id INTO v_id FROM course_activities WHERE lesson_id = v_lesson LIMIT 1;
  ELSIF v_chatbot IS NOT NULL THEN
    SELECT id INTO v_id FROM course_activities WHERE chatbot_id = v_chatbot LIMIT 1;
  ELSIF v_interactive IS NOT NULL THEN
    SELECT id INTO v_id FROM course_activities WHERE interactive_id = v_interactive LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE course_activities SET
      course_id = COALESCE(v_course, course_id),
      tenant_id = COALESCE(v_tenant, tenant_id),
      professor_id = v_professor,
      type = v_type,
      title = COALESCE(NULLIF(trim(p_payload->>'title'), ''), title),
      description = CASE
        WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '')
        ELSE description
      END,
      start_date = CASE
        WHEN p_payload ? 'startDate' THEN NULLIF(p_payload->>'startDate', '')::timestamptz
        ELSE start_date
      END,
      end_date = CASE
        WHEN p_payload ? 'endDate' THEN NULLIF(p_payload->>'endDate', '')::timestamptz
        ELSE end_date
      END,
      is_active = COALESCE((p_payload->>'isActive')::boolean, is_active),
      source_outline_item_id = CASE
        WHEN p_payload ? 'sourceOutlineItemId'
          THEN NULLIF(p_payload->>'sourceOutlineItemId', '')::uuid
        ELSE source_outline_item_id
      END,
      position = COALESCE((p_payload->>'position')::int, position),
      updated_at = now()
    WHERE id = v_id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO course_activities (
      course_id, tenant_id, professor_id, type, title, description,
      quiz_id, lesson_id, chatbot_id, interactive_id,
      start_date, end_date, is_active, source_outline_item_id, position
    ) VALUES (
      v_course,
      v_tenant,
      v_professor,
      v_type,
      COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled'),
      NULLIF(p_payload->>'description', ''),
      v_quiz, v_lesson, v_chatbot, v_interactive,
      NULLIF(p_payload->>'startDate', '')::timestamptz,
      NULLIF(p_payload->>'endDate', '')::timestamptz,
      COALESCE((p_payload->>'isActive')::boolean, true),
      NULLIF(p_payload->>'sourceOutlineItemId', '')::uuid,
      COALESCE((p_payload->>'position')::int, 0)
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'courseId', v_row.course_id,
    'type', v_row.type,
    'title', v_row.title,
    'isActive', v_row.is_active
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_soft_delete_course_activity(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz uuid := NULLIF(p_payload->>'quizId', '')::uuid;
  v_lesson uuid := NULLIF(p_payload->>'lessonId', '')::uuid;
  v_chatbot uuid := NULLIF(p_payload->>'chatbotId', '')::uuid;
  v_interactive uuid := NULLIF(p_payload->>'interactiveId', '')::uuid;
  v_id uuid;
  v_tenant uuid;
BEGIN
  IF v_quiz IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE quiz_id = v_quiz LIMIT 1;
  ELSIF v_lesson IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE lesson_id = v_lesson LIMIT 1;
  ELSIF v_chatbot IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE chatbot_id = v_chatbot LIMIT 1;
  ELSIF v_interactive IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE interactive_id = v_interactive LIMIT 1;
  END IF;
  IF v_id IS NULL THEN RETURN; END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE course_activities
  SET deleted_at = now(), updated_at = now()
  WHERE id = v_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_course_activity_active(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz uuid := NULLIF(p_payload->>'quizId', '')::uuid;
  v_lesson uuid := NULLIF(p_payload->>'lessonId', '')::uuid;
  v_chatbot uuid := NULLIF(p_payload->>'chatbotId', '')::uuid;
  v_interactive uuid := NULLIF(p_payload->>'interactiveId', '')::uuid;
  v_active boolean := COALESCE((p_payload->>'isActive')::boolean, true);
  v_id uuid;
  v_tenant uuid;
BEGIN
  IF v_quiz IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE quiz_id = v_quiz LIMIT 1;
  ELSIF v_lesson IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE lesson_id = v_lesson LIMIT 1;
  ELSIF v_chatbot IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE chatbot_id = v_chatbot LIMIT 1;
  ELSIF v_interactive IS NOT NULL THEN
    SELECT id, tenant_id INTO v_id, v_tenant FROM course_activities WHERE interactive_id = v_interactive LIMIT 1;
  END IF;
  IF v_id IS NULL THEN RETURN; END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE course_activities
  SET is_active = v_active, updated_at = now()
  WHERE id = v_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_section_ends_at(
  p_section_id uuid,
  p_ends_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
  v_ends timestamptz;
BEGIN
  SELECT COALESCE(s.tenant_id, s.workspace_id) INTO v_tenant
  FROM sections s
  WHERE s.id = p_section_id AND s.deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Section not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE sections
  SET ends_at = p_ends_at, updated_at = now()
  WHERE id = p_section_id
  RETURNING id, ends_at INTO v_id, v_ends;

  RETURN jsonb_build_object('id', v_id, 'endsAt', v_ends);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_professor_section_enroll(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professor uuid := (p_payload->>'professorId')::uuid;
  v_section uuid := (p_payload->>'sectionId')::uuid;
  v_tenant uuid;
  v_offering uuid;
BEGIN
  IF v_professor IS NULL OR v_section IS NULL THEN
    RAISE EXCEPTION 'professorId and sectionId required';
  END IF;

  SELECT COALESCE(s.tenant_id, s.workspace_id), s.offering_id
  INTO v_tenant, v_offering
  FROM sections s
  WHERE s.id = v_section AND s.deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Section not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  IF EXISTS (
    SELECT 1 FROM professor_sections
    WHERE section_id = v_section AND professor_id = v_professor
  ) THEN
    RAISE EXCEPTION 'Already enrolled in this section';
  END IF;

  INSERT INTO professor_sections (
    professor_id, section_id, tenant_id, offering_id
  ) VALUES (
    v_professor, v_section, v_tenant, v_offering
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_professor_section_leave(
  p_professor_id uuid,
  p_section_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(s.tenant_id, s.workspace_id) INTO v_tenant
  FROM sections s WHERE s.id = p_section_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  DELETE FROM professor_sections
  WHERE section_id = p_section_id AND professor_id = p_professor_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_professor_section_enrollment(
  p_professor_id uuid,
  p_section_id uuid
)
RETURNS TABLE (id uuid, status text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT ps.id, ps.status::text
  FROM professor_sections ps
  WHERE ps.professor_id = p_professor_id AND ps.section_id = p_section_id
  LIMIT 1;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_archive_quiz(p_quiz_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM quizzes WHERE id = p_quiz_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE quizzes
  SET is_active = false, deleted_at = now(), updated_at = now()
  WHERE id = p_quiz_id;

  RETURN p_quiz_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_assign_quiz_sections(p_payload jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz uuid := (p_payload->>'quizId')::uuid;
  v_assigned_by uuid := (p_payload->>'assignedBy')::uuid;
  v_tenant uuid;
  v_section uuid;
  v_ids uuid[];
BEGIN
  SELECT tenant_id INTO v_tenant FROM quizzes WHERE id = v_quiz AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOR v_section IN
    SELECT (jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb)))::uuid
  LOOP
    INSERT INTO quiz_sections (quiz_id, section_id, assigned_by, tenant_id)
    VALUES (v_quiz, v_section, v_assigned_by, v_tenant)
    ON CONFLICT DO NOTHING;
  END LOOP;

  SELECT array_agg(section_id) INTO v_ids
  FROM quiz_sections WHERE quiz_id = v_quiz;
  RETURN COALESCE(v_ids, ARRAY[]::uuid[]);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_unassign_quiz_section(
  p_section_id uuid,
  p_quiz_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(s.tenant_id, s.workspace_id) INTO v_tenant
  FROM sections s WHERE s.id = p_section_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  DELETE FROM quiz_sections
  WHERE section_id = p_section_id AND quiz_id = p_quiz_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_unassign_chatbot_section(
  p_section_id uuid,
  p_chatbot_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(s.tenant_id, s.workspace_id) INTO v_tenant
  FROM sections s WHERE s.id = p_section_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  DELETE FROM chatbot_sections
  WHERE section_id = p_section_id AND chatbot_id = p_chatbot_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_duplicate_quiz(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source uuid := (p_payload->>'sourceQuizId')::uuid;
  v_professor uuid := (p_payload->>'professorId')::uuid;
  v_title text := NULLIF(trim(p_payload->>'title'), '');
  v_section_ids uuid[] := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb))::uuid),
    ARRAY[]::uuid[]
  );
  v_src quizzes%ROWTYPE;
  v_new uuid;
  v_q questions%ROWTYPE;
BEGIN
  SELECT * INTO v_src FROM quizzes WHERE id = v_source AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  IF v_src.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_src.tenant_id::text, true);
  END IF;

  INSERT INTO quizzes (
    title, description, professor_id, tenant_id, offering_id,
    max_attempts, time_limit, passing_score, start_date, end_date, is_active
  ) VALUES (
    COALESCE(v_title, v_src.title || ' (Copy)'),
    v_src.description,
    v_professor,
    v_src.tenant_id,
    v_src.offering_id,
    v_src.max_attempts,
    v_src.time_limit,
    v_src.passing_score,
    v_src.start_date,
    v_src.end_date,
    false
  )
  RETURNING id INTO v_new;

  FOR v_q IN SELECT * FROM questions WHERE quiz_id = v_source
  LOOP
    INSERT INTO questions (
      quiz_id, tenant_id, offering_id, type, question, options,
      correct_answer, points, "order", concept_tags, rubric, rubric_status
    ) VALUES (
      v_new, v_src.tenant_id, v_src.offering_id, v_q.type, v_q.question, v_q.options,
      v_q.correct_answer, v_q.points, v_q."order", v_q.concept_tags, v_q.rubric, v_q.rubric_status
    );
  END LOOP;

  IF array_length(v_section_ids, 1) IS NOT NULL THEN
    INSERT INTO quiz_sections (quiz_id, section_id, assigned_by, tenant_id)
    SELECT v_new, sid, v_professor, v_src.tenant_id
    FROM unnest(v_section_ids) AS sid;
  END IF;

  RETURN jsonb_build_object('id', v_new, 'title', COALESCE(v_title, v_src.title || ' (Copy)'));
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_create_chatbot(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professor uuid := (p_payload->>'professorId')::uuid;
  v_section_ids uuid[] := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb))::uuid),
    ARRAY[]::uuid[]
  );
  v_tenant uuid;
  v_offering uuid;
  v_id uuid;
  v_title text;
BEGIN
  IF array_length(v_section_ids, 1) IS NOT NULL THEN
    SELECT COALESCE(s.tenant_id, s.workspace_id), s.offering_id
    INTO v_tenant, v_offering
    FROM sections s WHERE s.id = v_section_ids[1] AND s.deleted_at IS NULL;
  END IF;
  v_tenant := COALESCE(v_tenant, NULLIF(p_payload->>'tenantId', '')::uuid);
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  INSERT INTO chatbots (
    professor_id, tenant_id, offering_id, title, description, persona_name,
    instructions, system_prompt, related_quiz_id, is_template, model, is_active
  ) VALUES (
    v_professor,
    v_tenant,
    v_offering,
    COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled discussion'),
    NULLIF(p_payload->>'description', ''),
    COALESCE(NULLIF(trim(p_payload->>'personaName'), ''), 'Professor Emma'),
    COALESCE(p_payload->>'instructions', ''),
    COALESCE(p_payload->>'systemPrompt', ''),
    NULLIF(p_payload->>'relatedQuizId', '')::uuid,
    false,
    COALESCE(NULLIF(p_payload->>'model', ''), 'gpt-4.1-mini'),
    COALESCE((p_payload->>'isActive')::boolean, true)
  )
  RETURNING id, title INTO v_id, v_title;

  IF array_length(v_section_ids, 1) IS NOT NULL THEN
    INSERT INTO chatbot_sections (chatbot_id, section_id, assigned_by, tenant_id)
    SELECT v_id, sid, v_professor, v_tenant
    FROM unnest(v_section_ids) AS sid;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'title', v_title);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_update_chatbot(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := (p_payload->>'chatbotId')::uuid;
  v_tenant uuid;
  v_assigned_by uuid := NULLIF(p_payload->>'assignedBy', '')::uuid;
  v_section_ids uuid[];
BEGIN
  SELECT tenant_id INTO v_tenant FROM chatbots WHERE id = v_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Discussion not found';
  END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  UPDATE chatbots SET
    title = CASE WHEN p_payload ? 'title' THEN COALESCE(NULLIF(trim(p_payload->>'title'), ''), title) ELSE title END,
    description = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description', '') ELSE description END,
    persona_name = CASE WHEN p_payload ? 'personaName' THEN COALESCE(NULLIF(trim(p_payload->>'personaName'), ''), persona_name) ELSE persona_name END,
    instructions = CASE WHEN p_payload ? 'instructions' THEN COALESCE(p_payload->>'instructions', instructions) ELSE instructions END,
    system_prompt = CASE WHEN p_payload ? 'systemPrompt' THEN COALESCE(p_payload->>'systemPrompt', system_prompt) ELSE system_prompt END,
    related_quiz_id = CASE
      WHEN p_payload ? 'relatedQuizId' THEN NULLIF(p_payload->>'relatedQuizId', '')::uuid
      ELSE related_quiz_id
    END,
    is_active = CASE WHEN p_payload ? 'isActive' THEN (p_payload->>'isActive')::boolean ELSE is_active END,
    updated_at = now()
  WHERE id = v_id;

  IF p_payload ? 'sectionIds' THEN
    v_section_ids := COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb))::uuid),
      ARRAY[]::uuid[]
    );
    DELETE FROM chatbot_sections WHERE chatbot_id = v_id;
    IF array_length(v_section_ids, 1) IS NOT NULL THEN
      INSERT INTO chatbot_sections (chatbot_id, section_id, assigned_by, tenant_id)
      SELECT v_id, sid, v_assigned_by, v_tenant
      FROM unnest(v_section_ids) AS sid;
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_assign_chatbot_sections(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := (p_payload->>'chatbotId')::uuid;
  v_assigned_by uuid := (p_payload->>'assignedBy')::uuid;
  v_tenant uuid;
  v_section uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM chatbots WHERE id = v_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Discussion not found';
  END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  FOR v_section IN
    SELECT (jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb)))::uuid
  LOOP
    INSERT INTO chatbot_sections (chatbot_id, section_id, assigned_by, tenant_id)
    VALUES (v_id, v_section, v_assigned_by, v_tenant)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_duplicate_chatbot(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source uuid := (p_payload->>'sourceChatbotId')::uuid;
  v_professor uuid := (p_payload->>'professorId')::uuid;
  v_src chatbots%ROWTYPE;
  v_new uuid;
  v_title text;
BEGIN
  SELECT * INTO v_src FROM chatbots WHERE id = v_source AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Discussion not found';
  END IF;
  IF v_src.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_src.tenant_id::text, true);
  END IF;

  v_title := CASE
    WHEN v_src.is_template THEN v_src.title
    ELSE v_src.title || ' (copy)'
  END;

  INSERT INTO chatbots (
    professor_id, tenant_id, offering_id, title, description, persona_name,
    instructions, system_prompt, related_quiz_id, is_template, model, is_active
  ) VALUES (
    v_professor, v_src.tenant_id, v_src.offering_id, v_title, v_src.description,
    v_src.persona_name, v_src.instructions, v_src.system_prompt, v_src.related_quiz_id,
    false, v_src.model, true
  )
  RETURNING id INTO v_new;

  RETURN jsonb_build_object('id', v_new, 'title', v_title);
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_list_role_bindings_at_user_scope(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_find_role_binding(uuid, uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_role_binding_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_count_active_owners(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_list_active_bindings_for_scope(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_upsert_role_binding(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_revoke_role_binding(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_ensure_offering(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_sync_course_activity(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_soft_delete_course_activity(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_course_activity_active(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_section_ends_at(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_professor_section_enroll(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_professor_section_leave(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_professor_section_enrollment(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_archive_quiz(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_assign_quiz_sections(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_unassign_quiz_section(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_unassign_chatbot_section(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_duplicate_quiz(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_chatbot(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_update_chatbot(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_assign_chatbot_sections(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_duplicate_chatbot(jsonb) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_list_role_bindings_at_user_scope(uuid, text, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_find_role_binding(uuid, uuid, text, uuid, text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_role_binding_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_count_active_owners(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_list_active_bindings_for_scope(uuid, text, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_upsert_role_binding(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_revoke_role_binding(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_ensure_offering(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_sync_course_activity(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_soft_delete_course_activity(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_course_activity_active(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_section_ends_at(uuid, timestamptz) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_professor_section_enroll(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_professor_section_leave(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_professor_section_enrollment(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_archive_quiz(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_assign_quiz_sections(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_unassign_quiz_section(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_unassign_chatbot_section(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_duplicate_quiz(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_create_chatbot(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_update_chatbot(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_assign_chatbot_sections(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_duplicate_chatbot(jsonb) TO sol_app;
  END IF;
END
$$;
