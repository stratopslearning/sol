-- Authoring chat + quiz version writes under FORCE RLS (no app.tenant_id).

CREATE OR REPLACE FUNCTION sol_insert_authoring_messages(
  p_outline_id uuid,
  p_tenant_id uuid,
  p_messages jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg jsonb;
BEGIN
  IF p_outline_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'outlineId and tenantId required';
  END IF;

  FOR v_msg IN SELECT * FROM jsonb_array_elements(COALESCE(p_messages, '[]'::jsonb))
  LOOP
    INSERT INTO authoring_messages (outline_id, tenant_id, role, content)
    VALUES (
      p_outline_id,
      p_tenant_id,
      COALESCE(NULLIF(v_msg->>'role', ''), 'assistant'),
      COALESCE(v_msg->>'content', '')
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION sol_create_quiz_version_snapshot(
  p_quiz_id uuid,
  p_created_by uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz quizzes%ROWTYPE;
  v_questions jsonb;
  v_version integer;
  v_snapshot jsonb;
  v_id uuid;
BEGIN
  SELECT * INTO v_quiz FROM quizzes WHERE quizzes.id = p_quiz_id AND quizzes.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found: %', p_quiz_id;
  END IF;
  IF v_quiz.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quiz missing tenant_id: %', p_quiz_id;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q."order"), '[]'::jsonb)
  INTO v_questions
  FROM questions q
  WHERE q.quiz_id = p_quiz_id;

  SELECT COALESCE(MAX(quiz_versions.version), 0) + 1
  INTO v_version
  FROM quiz_versions
  WHERE quiz_versions.quiz_id = p_quiz_id;

  v_snapshot := jsonb_build_object(
    'quiz', to_jsonb(v_quiz),
    'questions', v_questions,
    'capturedAt', to_jsonb(now())
  );

  INSERT INTO quiz_versions (quiz_id, tenant_id, version, snapshot, created_by)
  VALUES (p_quiz_id, v_quiz.tenant_id, v_version, v_snapshot, p_created_by)
  RETURNING quiz_versions.id INTO v_id;

  id := v_id;
  version := v_version;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION sol_mark_outline_item_published(
  p_item_id uuid,
  p_published_quiz_id uuid DEFAULT NULL,
  p_published_chatbot_id uuid DEFAULT NULL,
  p_published_lesson_id uuid DEFAULT NULL,
  p_published_interactive_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE outline_items
  SET
    status = 'PUBLISHED',
    published_quiz_id = COALESCE(p_published_quiz_id, published_quiz_id),
    published_chatbot_id = COALESCE(p_published_chatbot_id, published_chatbot_id),
    published_lesson_id = COALESCE(p_published_lesson_id, published_lesson_id),
    published_interactive_id = COALESCE(
      p_published_interactive_id,
      published_interactive_id
    ),
    updated_at = now()
  WHERE id = p_item_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION sol_insert_authoring_messages(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_quiz_version_snapshot(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_mark_outline_item_published(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_insert_authoring_messages(uuid, uuid, jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_create_quiz_version_snapshot(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_mark_outline_item_published(uuid, uuid, uuid, uuid, uuid) TO sol_app;
  END IF;
END
$$;
