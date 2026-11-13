-- FORCE RLS remaining pack: connectors, student surfaces, sectionCopyQuiz,
-- admin material purge, lesson/interactive creates.

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_knowledge_connector_by_id(p_connector_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row knowledge_connectors%ROWTYPE;
BEGIN
  IF p_connector_id IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
  FROM knowledge_connectors WHERE id = p_connector_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT * INTO v_row FROM knowledge_connectors WHERE id = p_connector_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_knowledge_connectors(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_workspace_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);
  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(kc) ORDER BY kc.updated_at DESC)
      FROM knowledge_connectors kc
      WHERE kc.workspace_id = p_workspace_id AND kc.deleted_at IS NULL
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_knowledge_sync_runs(
  p_connector_id uuid,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF p_connector_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
  FROM knowledge_connectors WHERE id = p_connector_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.started_at DESC)
      FROM (
        SELECT *
        FROM knowledge_sync_runs
        WHERE connector_id = p_connector_id
        ORDER BY started_at DESC
        LIMIT GREATEST(COALESCE(p_limit, 10), 1)
      ) r
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_knowledge_doc_by_connector_external(
  p_workspace_id uuid,
  p_connector_id uuid,
  p_external_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row knowledge_documents%ROWTYPE;
BEGIN
  IF p_workspace_id IS NULL OR p_connector_id IS NULL OR p_external_id IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);
  SELECT * INTO v_row
  FROM knowledge_documents
  WHERE workspace_id = p_workspace_id
    AND connector_id = p_connector_id
    AND external_id = p_external_id
    AND deleted_at IS NULL
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_create_connector_knowledge_document(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_user uuid := NULLIF(p_payload->>'createdByUserId', '')::uuid;
  v_id uuid := COALESCE(NULLIF(p_payload->>'id', '')::uuid, gen_random_uuid());
  v_row knowledge_documents%ROWTYPE;
BEGIN
  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'workspaceId required';
  END IF;
  PERFORM set_config('app.tenant_id', v_workspace::text, true);

  INSERT INTO knowledge_documents (
    id, workspace_id, tenant_id, title, source_kind, mime_type, byte_size,
    connector_id, external_id, external_path, status, visibility, created_by_user_id
  ) VALUES (
    v_id,
    v_workspace,
    v_workspace,
    COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled'),
    COALESCE(p_payload->>'sourceKind', 'CONNECTOR'),
    NULLIF(p_payload->>'mimeType', ''),
    NULLIF(p_payload->>'byteSize', '')::int,
    NULLIF(p_payload->>'connectorId', '')::uuid,
    NULLIF(p_payload->>'externalId', ''),
    NULLIF(p_payload->>'externalPath', ''),
    COALESCE(p_payload->>'status', 'PENDING'),
    COALESCE(p_payload->>'visibility', 'workspace'),
    v_user
  )
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_start_knowledge_sync_run(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connector uuid := (p_payload->>'connectorId')::uuid;
  v_workspace uuid;
  v_tenant uuid;
  v_run knowledge_sync_runs%ROWTYPE;
BEGIN
  IF v_connector IS NULL THEN RAISE EXCEPTION 'connectorId required'; END IF;
  SELECT workspace_id, COALESCE(tenant_id, workspace_id)
  INTO v_workspace, v_tenant
  FROM knowledge_connectors
  WHERE id = v_connector AND deleted_at IS NULL;
  IF v_workspace IS NULL THEN RAISE EXCEPTION 'Connector not found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE knowledge_connectors
  SET status = 'syncing', error_message = NULL, updated_at = now()
  WHERE id = v_connector;

  INSERT INTO knowledge_sync_runs (
    connector_id, workspace_id, tenant_id, status
  ) VALUES (
    v_connector, v_workspace, v_tenant, 'running'
  )
  RETURNING * INTO v_run;
  RETURN to_jsonb(v_run);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_finish_knowledge_sync_run(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run uuid := (p_payload->>'runId')::uuid;
  v_connector uuid := (p_payload->>'connectorId')::uuid;
  v_tenant uuid;
  v_status text := COALESCE(p_payload->>'status', 'succeeded');
  v_config jsonb;
BEGIN
  IF v_run IS NULL OR v_connector IS NULL THEN
    RAISE EXCEPTION 'runId and connectorId required';
  END IF;
  SELECT COALESCE(tenant_id, workspace_id), config
  INTO v_tenant, v_config
  FROM knowledge_connectors WHERE id = v_connector;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  UPDATE knowledge_sync_runs SET
    status = v_status,
    finished_at = now(),
    created_count = COALESCE((p_payload->>'createdCount')::int, created_count),
    updated_count = COALESCE((p_payload->>'updatedCount')::int, updated_count),
    skipped_count = COALESCE((p_payload->>'skippedCount')::int, skipped_count),
    error_count = COALESCE((p_payload->>'errorCount')::int, error_count),
    error_message = CASE
      WHEN p_payload ? 'errorMessage' THEN NULLIF(p_payload->>'errorMessage', '')
      ELSE error_message
    END
  WHERE id = v_run;

  IF v_status = 'succeeded' THEN
    UPDATE knowledge_connectors SET
      status = 'connected',
      last_sync_at = now(),
      config = CASE
        WHEN p_payload ? 'config' THEN COALESCE(p_payload->'config', config)
        ELSE config
      END,
      error_message = NULL,
      updated_at = now()
    WHERE id = v_connector;
  ELSE
    UPDATE knowledge_connectors SET
      status = 'error',
      error_message = NULLIF(p_payload->>'errorMessage', ''),
      updated_at = now()
    WHERE id = v_connector;
  END IF;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_lesson_by_id(p_lesson_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row lessons%ROWTYPE;
BEGIN
  IF p_lesson_id IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(l.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM lessons l
  JOIN courses c ON c.id = l.course_id
  WHERE l.id = p_lesson_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT * INTO v_row FROM lessons WHERE id = p_lesson_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_lesson_section_ids(p_lesson_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_ids uuid[];
BEGIN
  IF p_lesson_id IS NULL THEN RETURN ARRAY[]::uuid[]; END IF;
  SELECT COALESCE(l.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM lessons l JOIN courses c ON c.id = l.course_id
  WHERE l.id = p_lesson_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT COALESCE(array_agg(section_id), ARRAY[]::uuid[])
  INTO v_ids FROM lesson_sections WHERE lesson_id = p_lesson_id;
  RETURN v_ids;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_student_lessons_for_sections(p_section_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_section_ids IS NULL OR cardinality(p_section_ids) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.title, x."sectionName")
      FROM (
        SELECT
          l.id,
          l.title,
          c.title AS "courseTitle",
          s.name AS "sectionName",
          s.id AS "sectionId",
          (
            SELECT count(*)::int FROM flashcards f
            WHERE f.lesson_id = l.id AND f.deleted_at IS NULL
          ) AS "flashcardCount"
        FROM lesson_sections ls
        JOIN lessons l ON l.id = ls.lesson_id
        JOIN sections s ON s.id = ls.section_id
        JOIN courses c ON c.id = l.course_id
        WHERE ls.section_id = ANY(p_section_ids)
          AND l.deleted_at IS NULL
          AND l.is_active = true
      ) x
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_lesson_flashcards(p_lesson_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF p_lesson_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(l.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM lessons l JOIN courses c ON c.id = l.course_id
  WHERE l.id = p_lesson_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'front', f.front,
          'back', f.back,
          'position', f.position
        )
        ORDER BY f.position ASC
      )
      FROM flashcards f
      WHERE f.lesson_id = p_lesson_id AND f.deleted_at IS NULL
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_lesson_progress_for_student(
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
  v_row lesson_progress%ROWTYPE;
BEGIN
  IF p_lesson_id IS NULL OR p_student_id IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(l.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM lessons l JOIN courses c ON c.id = l.course_id
  WHERE l.id = p_lesson_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT * INTO v_row
  FROM lesson_progress
  WHERE lesson_id = p_lesson_id AND student_id = p_student_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_lesson_progress(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson uuid := (p_payload->>'lessonId')::uuid;
  v_student uuid := (p_payload->>'studentId')::uuid;
  v_status text := p_payload->>'status';
  v_tenant uuid;
  v_row lesson_progress%ROWTYPE;
BEGIN
  IF v_lesson IS NULL OR v_student IS NULL OR v_status IS NULL THEN
    RAISE EXCEPTION 'lessonId, studentId, status required';
  END IF;
  SELECT COALESCE(l.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM lessons l JOIN courses c ON c.id = l.course_id
  WHERE l.id = v_lesson;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Lesson not found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT * INTO v_row
  FROM lesson_progress
  WHERE lesson_id = v_lesson AND student_id = v_student;

  IF NOT FOUND THEN
    INSERT INTO lesson_progress (
      lesson_id, student_id, tenant_id, status, completed_at
    ) VALUES (
      v_lesson, v_student, v_tenant, v_status,
      CASE WHEN v_status = 'COMPLETED' THEN now() ELSE NULL END
    )
    RETURNING * INTO v_row;
  ELSE
    IF v_row.status = 'COMPLETED' AND v_status = 'STARTED' THEN
      RAISE EXCEPTION 'Lesson is already completed';
    END IF;
    UPDATE lesson_progress SET
      status = v_status,
      completed_at = CASE
        WHEN v_status = 'COMPLETED' THEN COALESCE(completed_at, now())
        ELSE completed_at
      END,
      updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_interactive_by_id(p_interactive_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row interactives%ROWTYPE;
BEGIN
  IF p_interactive_id IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(i.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM interactives i JOIN courses c ON c.id = i.course_id
  WHERE i.id = p_interactive_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT * INTO v_row FROM interactives WHERE id = p_interactive_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_student_interactives_for_sections(p_section_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_section_ids IS NULL OR cardinality(p_section_ids) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE(
    (
      SELECT jsonb_agg(DISTINCT jsonb_build_object(
        'id', i.id,
        'title', i.title,
        'kind', i.kind,
        'courseId', i.course_id,
        'isActive', i.is_active
      ))
      FROM interactive_sections ins
      JOIN interactives i ON i.id = ins.interactive_id
      WHERE ins.section_id = ANY(p_section_ids)
        AND i.deleted_at IS NULL
        AND i.is_active = true
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_chatbot_by_id(p_chatbot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row chatbots%ROWTYPE;
BEGIN
  IF p_chatbot_id IS NULL THEN RETURN NULL; END IF;
  SELECT tenant_id INTO v_tenant FROM chatbots WHERE id = p_chatbot_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT * INTO v_row
  FROM chatbots
  WHERE id = p_chatbot_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_chatbot_section_ids(p_chatbot_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_ids uuid[];
BEGIN
  IF p_chatbot_id IS NULL THEN RETURN ARRAY[]::uuid[]; END IF;
  SELECT tenant_id INTO v_tenant FROM chatbots WHERE id = p_chatbot_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT COALESCE(array_agg(section_id), ARRAY[]::uuid[])
  INTO v_ids FROM chatbot_sections WHERE chatbot_id = p_chatbot_id;
  RETURN v_ids;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_student_quiz_due_for_sections(p_section_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_section_ids IS NULL OR cardinality(p_section_ids) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(x)::jsonb)
      FROM (
        SELECT
          q.id AS "quizId",
          q.title,
          q.start_date AS "startDate",
          q.end_date AS "endDate",
          q.is_active AS "isActive",
          qs.section_id AS "sectionId",
          s.name AS "sectionName",
          c.title AS "courseTitle"
        FROM quiz_sections qs
        JOIN quizzes q ON q.id = qs.quiz_id
        JOIN sections s ON s.id = qs.section_id
        JOIN courses c ON c.id = s.course_id
        WHERE qs.section_id = ANY(p_section_ids)
          AND q.deleted_at IS NULL
          AND q.is_active = true
      ) x
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_student_assignment_dues(
  p_student_id uuid,
  p_quiz_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS NULL OR p_quiz_ids IS NULL OR cardinality(p_quiz_ids) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object(
        'quizId', a.quiz_id,
        'dueDate', a.due_date
      ))
      FROM assignments a
      WHERE a.student_id = p_student_id
        AND a.quiz_id = ANY(p_quiz_ids)
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_lessons_for_section_context(
  p_course_id uuid,
  p_section_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF p_course_id IS NULL OR p_section_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(c.tenant_id, c.workspace_id) INTO v_tenant
  FROM courses c WHERE c.id = p_course_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'title', l.title,
          'markdown', l.markdown,
          'updatedAt', l.updated_at
        )
        ORDER BY l.updated_at DESC
      )
      FROM lesson_sections ls
      JOIN lessons l ON l.id = ls.lesson_id
      WHERE ls.section_id = p_section_id
        AND l.course_id = p_course_id
        AND l.is_active = true
        AND l.deleted_at IS NULL
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_section_copy_quiz(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source uuid := (p_payload->>'sourceQuizId')::uuid;
  v_professor uuid := (p_payload->>'professorId')::uuid;
  v_section_ids uuid[] := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb))::uuid),
    ARRAY[]::uuid[]
  );
  v_src quizzes%ROWTYPE;
  v_new uuid;
  v_title text;
  v_q questions%ROWTYPE;
BEGIN
  IF v_source IS NULL OR v_professor IS NULL OR cardinality(v_section_ids) = 0 THEN
    RAISE EXCEPTION 'sourceQuizId, professorId, sectionIds required';
  END IF;

  SELECT * INTO v_src FROM quizzes WHERE id = v_source AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_src.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_src.tenant_id::text, true);
  END IF;

  v_title := v_src.title;
  INSERT INTO quizzes (
    title, description, professor_id, tenant_id, offering_id,
    max_attempts, time_limit, passing_score, start_date, end_date, is_active
  ) VALUES (
    v_title, v_src.description, v_professor, v_src.tenant_id, v_src.offering_id,
    v_src.max_attempts, v_src.time_limit, v_src.passing_score,
    v_src.start_date, v_src.end_date, v_src.is_active
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

  INSERT INTO quiz_sections (quiz_id, section_id, assigned_by, tenant_id)
  SELECT v_new, sid, v_professor, v_src.tenant_id
  FROM unnest(v_section_ids) AS sid;

  UPDATE attempts
  SET quiz_id = v_new
  WHERE quiz_id = v_source AND section_id = ANY(v_section_ids);

  UPDATE assignments a
  SET quiz_id = v_new
  WHERE a.quiz_id = v_source
    AND a.student_id IN (
      SELECT ss.student_id FROM student_sections ss
      WHERE ss.section_id = ANY(v_section_ids) AND ss.status = 'ACTIVE'
    );

  DELETE FROM quiz_sections
  WHERE quiz_id = v_source AND section_id = ANY(v_section_ids);

  RETURN jsonb_build_object(
    'id', v_new,
    'title', v_title,
    'sectionIds', to_jsonb(v_section_ids)
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_purge_course_material(p_material_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row course_materials%ROWTYPE;
BEGIN
  IF p_material_id IS NULL THEN RAISE EXCEPTION 'materialId required'; END IF;
  SELECT COALESCE(m.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM course_materials m
  JOIN courses c ON c.id = m.course_id
  WHERE m.id = p_material_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Material not found'; END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  SELECT * INTO v_row FROM course_materials WHERE id = p_material_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Material not found'; END IF;

  DELETE FROM course_material_chunks WHERE material_id = p_material_id;
  DELETE FROM course_materials WHERE id = p_material_id;

  RETURN jsonb_build_object(
    's3Key', v_row.s3_key,
    'courseId', v_row.course_id,
    'title', v_row.title,
    'tenantId', COALESCE(v_row.tenant_id, v_tenant)
  );
END;
$$;

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
    professor_id, course_id, tenant_id, offering_id, title, markdown,
    is_active, source_outline_item_id
  ) VALUES (
    v_professor, v_course, v_tenant, v_offering,
    COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled lesson'),
    COALESCE(p_payload->>'markdown', ''),
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
CREATE OR REPLACE FUNCTION sol_create_interactive(p_payload jsonb)
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
  v_row interactives%ROWTYPE;
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

  INSERT INTO interactives (
    professor_id, course_id, tenant_id, offering_id, title, description,
    kind, body, package_storage_key, is_active, source_outline_item_id
  ) VALUES (
    v_professor, v_course, v_tenant, v_offering,
    COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled interactive'),
    NULLIF(p_payload->>'description', ''),
    COALESCE(p_payload->>'kind', 'SCORM'),
    COALESCE(p_payload->'body', '{}'::jsonb),
    NULL,
    COALESCE((p_payload->>'isActive')::boolean, false),
    NULLIF(p_payload->>'sourceOutlineItemId', '')::uuid
  )
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_knowledge_connector_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_list_knowledge_connectors(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_list_knowledge_sync_runs(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_knowledge_doc_by_connector_external(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_connector_knowledge_document(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_start_knowledge_sync_run(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_finish_knowledge_sync_run(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_lesson_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_lesson_section_ids(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_student_lessons_for_sections(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_lesson_flashcards(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_lesson_progress_for_student(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_upsert_lesson_progress(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_interactive_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_student_interactives_for_sections(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_chatbot_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_chatbot_section_ids(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_student_quiz_due_for_sections(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_student_assignment_dues(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_lessons_for_section_context(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_section_copy_quiz(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_purge_course_material(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_lesson(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_interactive(jsonb) FROM PUBLIC;

--> statement-breakpoint
DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    FOR r IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'sol_knowledge_connector_by_id','sol_list_knowledge_connectors',
          'sol_list_knowledge_sync_runs','sol_knowledge_doc_by_connector_external',
          'sol_create_connector_knowledge_document','sol_start_knowledge_sync_run',
          'sol_finish_knowledge_sync_run','sol_lesson_by_id','sol_lesson_section_ids',
          'sol_student_lessons_for_sections','sol_lesson_flashcards',
          'sol_lesson_progress_for_student','sol_upsert_lesson_progress',
          'sol_interactive_by_id','sol_student_interactives_for_sections',
          'sol_chatbot_by_id','sol_chatbot_section_ids',
          'sol_student_quiz_due_for_sections','sol_student_assignment_dues',
          'sol_lessons_for_section_context','sol_section_copy_quiz',
          'sol_admin_purge_course_material','sol_create_lesson','sol_create_interactive'
        )
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO sol_app', r.sig);
    END LOOP;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner')
     AND pg_has_role(current_user, 'neondb_owner', 'member') THEN
    FOR r IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'sol_knowledge_connector_by_id','sol_list_knowledge_connectors',
          'sol_list_knowledge_sync_runs','sol_knowledge_doc_by_connector_external',
          'sol_create_connector_knowledge_document','sol_start_knowledge_sync_run',
          'sol_finish_knowledge_sync_run','sol_lesson_by_id','sol_lesson_section_ids',
          'sol_student_lessons_for_sections','sol_lesson_flashcards',
          'sol_lesson_progress_for_student','sol_upsert_lesson_progress',
          'sol_interactive_by_id','sol_student_interactives_for_sections',
          'sol_chatbot_by_id','sol_chatbot_section_ids',
          'sol_student_quiz_due_for_sections','sol_student_assignment_dues',
          'sol_lessons_for_section_context','sol_section_copy_quiz',
          'sol_admin_purge_course_material','sol_create_lesson','sol_create_interactive'
        )
    LOOP
      EXECUTE format('ALTER FUNCTION %s OWNER TO neondb_owner', r.sig);
    END LOOP;
  END IF;
END
$$;
