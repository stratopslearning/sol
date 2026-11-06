-- Wave 3: student attempt start/submit under FORCE RLS.
-- Wave 4: offering-scoped ta/grader in teaching section ids.

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_user_teaching_section_ids(p_user_id uuid)
RETURNS TABLE (section_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH b AS (
    SELECT role::text AS role, scope_type::text AS scope_type, scope_id, tenant_id
    FROM role_bindings
    WHERE user_id = p_user_id AND revoked_at IS NULL
  ),
  from_section AS (
    SELECT b.scope_id AS section_id
    FROM b
    WHERE b.scope_type = 'section'
      AND b.role IN ('ta', 'grader', 'lead_instructor', 'co_instructor', 'faculty', 'owner', 'admin')
  ),
  from_offering AS (
    SELECT s.id AS section_id
    FROM b
    JOIN sections s ON s.offering_id = b.scope_id AND s.deleted_at IS NULL
    WHERE b.scope_type = 'offering'
      AND b.role IN (
        'lead_instructor', 'co_instructor', 'faculty', 'owner', 'admin', 'ta', 'grader'
      )
  ),
  from_org AS (
    SELECT s.id AS section_id
    FROM b
    JOIN courses c ON c.workspace_id = b.tenant_id AND c.deleted_at IS NULL
    JOIN sections s ON s.course_id = c.id AND s.deleted_at IS NULL
    WHERE b.scope_type IN ('organization', 'department')
      AND b.role IN (
        'owner', 'admin', 'faculty', 'lead_instructor', 'co_instructor', 'ta', 'grader'
      )
  )
  SELECT DISTINCT section_id FROM (
    SELECT section_id FROM from_section
    UNION ALL
    SELECT section_id FROM from_offering
    UNION ALL
    SELECT section_id FROM from_org
  ) x
  WHERE section_id IS NOT NULL;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_start_quiz_attempt(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment uuid := (p_payload->>'assignmentId')::uuid;
  v_student uuid := (p_payload->>'studentId')::uuid;
  v_quiz uuid := (p_payload->>'quizId')::uuid;
  v_section uuid := (p_payload->>'sectionId')::uuid;
  v_tenant uuid;
  v_offering uuid;
  v_open attempts%ROWTYPE;
  v_new attempts%ROWTYPE;
BEGIN
  IF v_assignment IS NULL OR v_student IS NULL OR v_quiz IS NULL OR v_section IS NULL THEN
    RAISE EXCEPTION 'assignmentId, studentId, quizId, sectionId required';
  END IF;

  SELECT COALESCE(s.tenant_id, s.workspace_id), s.offering_id
  INTO v_tenant, v_offering
  FROM sections s WHERE s.id = v_section;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Section not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  PERFORM id FROM assignments WHERE id = v_assignment FOR UPDATE;

  SELECT * INTO v_open
  FROM attempts
  WHERE assignment_id = v_assignment
    AND student_id = v_student
    AND submitted_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_open.id,
      'startedAt', v_open.started_at,
      'answers', v_open.answers,
      'resumed', true
    );
  END IF;

  INSERT INTO attempts (
    assignment_id, student_id, quiz_id, section_id, tenant_id, offering_id,
    answers, max_score, started_at
  ) VALUES (
    v_assignment, v_student, v_quiz, v_section, v_tenant, v_offering,
    '{}'::jsonb, 0, now()
  )
  RETURNING * INTO v_new;

  RETURN jsonb_build_object(
    'id', v_new.id,
    'startedAt', v_new.started_at,
    'answers', v_new.answers,
    'resumed', false
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_submit_quiz_attempt(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment uuid := (p_payload->>'assignmentId')::uuid;
  v_student uuid := (p_payload->>'studentId')::uuid;
  v_quiz uuid := (p_payload->>'quizId')::uuid;
  v_section uuid := (p_payload->>'sectionId')::uuid;
  v_max_attempts int := COALESCE((p_payload->>'maxAttempts')::int, 1);
  v_tenant uuid;
  v_offering uuid;
  v_open attempts%ROWTYPE;
  v_submitted_count int;
  v_saved attempts%ROWTYPE;
  v_all jsonb;
BEGIN
  IF v_assignment IS NULL OR v_student IS NULL OR v_quiz IS NULL OR v_section IS NULL THEN
    RAISE EXCEPTION 'assignmentId, studentId, quizId, sectionId required';
  END IF;

  SELECT COALESCE(s.tenant_id, s.workspace_id), s.offering_id
  INTO v_tenant, v_offering
  FROM sections s WHERE s.id = v_section;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Section not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  PERFORM id FROM assignments WHERE id = v_assignment FOR UPDATE;

  SELECT * INTO v_open
  FROM attempts
  WHERE assignment_id = v_assignment
    AND student_id = v_student
    AND submitted_at IS NULL
  LIMIT 1;

  SELECT count(*)::int INTO v_submitted_count
  FROM attempts
  WHERE assignment_id = v_assignment
    AND student_id = v_student
    AND submitted_at IS NOT NULL;

  IF v_open.id IS NULL AND v_submitted_count >= v_max_attempts THEN
    RAISE EXCEPTION 'Max attempts exceeded';
  END IF;

  IF v_open.id IS NOT NULL THEN
    UPDATE attempts SET
      answers = COALESCE(p_payload->'answers', answers),
      quiz_version_id = NULLIF(p_payload->>'quizVersionId', '')::uuid,
      score = (p_payload->>'score')::int,
      max_score = (p_payload->>'maxScore')::int,
      percentage = (p_payload->>'percentage')::int,
      passed = (p_payload->>'passed')::boolean,
      gpt_feedback = COALESCE(p_payload->'gptFeedback', gpt_feedback),
      grading_status = NULLIF(p_payload->>'gradingStatus', ''),
      submitted_at = COALESCE(NULLIF(p_payload->>'submittedAt', '')::timestamptz, now()),
      tenant_id = COALESCE(tenant_id, v_tenant),
      offering_id = COALESCE(offering_id, v_offering)
    WHERE id = v_open.id
    RETURNING * INTO v_saved;
  ELSE
    INSERT INTO attempts (
      assignment_id, student_id, quiz_id, section_id, tenant_id, offering_id,
      quiz_version_id, answers, score, max_score, percentage, passed,
      gpt_feedback, grading_status, started_at, submitted_at
    ) VALUES (
      v_assignment, v_student, v_quiz, v_section, v_tenant, v_offering,
      NULLIF(p_payload->>'quizVersionId', '')::uuid,
      COALESCE(p_payload->'answers', '{}'::jsonb),
      (p_payload->>'score')::int,
      (p_payload->>'maxScore')::int,
      (p_payload->>'percentage')::int,
      (p_payload->>'passed')::boolean,
      p_payload->'gptFeedback',
      NULLIF(p_payload->>'gradingStatus', ''),
      COALESCE(NULLIF(p_payload->>'startedAt', '')::timestamptz, now()),
      COALESCE(NULLIF(p_payload->>'submittedAt', '')::timestamptz, now())
    )
    RETURNING * INTO v_saved;
  END IF;

  UPDATE assignments
  SET is_completed = true, completed_at = now()
  WHERE id = v_assignment;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', a.id, 'score', a.score, 'submittedAt', a.submitted_at)
  ), '[]'::jsonb)
  INTO v_all
  FROM attempts a
  WHERE a.assignment_id = v_assignment;

  RETURN jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', v_saved.id,
      'score', v_saved.score,
      'maxScore', v_saved.max_score,
      'percentage', v_saved.percentage,
      'passed', v_saved.passed,
      'gradingStatus', v_saved.grading_status,
      'submittedAt', v_saved.submitted_at
    ),
    'allAttempts', v_all
  );
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_start_quiz_attempt(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_submit_quiz_attempt(jsonb) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_user_teaching_section_ids(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_start_quiz_attempt(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_submit_quiz_attempt(jsonb) TO sol_app;
  END IF;
END
$$;
