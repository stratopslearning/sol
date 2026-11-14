-- Knowledge create/share/delete + quiz update under FORCE RLS.

CREATE OR REPLACE FUNCTION sol_create_knowledge_document(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_user uuid := NULLIF(p_payload->>'createdByUserId', '')::uuid;
  v_doc uuid;
BEGIN
  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'workspaceId required';
  END IF;

  INSERT INTO knowledge_documents (
    workspace_id,
    tenant_id,
    title,
    source_kind,
    mime_type,
    byte_size,
    external_url,
    status,
    visibility,
    created_by_user_id
  ) VALUES (
    v_workspace,
    v_workspace,
    COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Untitled'),
    COALESCE(p_payload->>'sourceKind', 'UPLOAD'),
    NULLIF(p_payload->>'mimeType', ''),
    NULLIF(p_payload->>'byteSize', '')::int,
    NULLIF(p_payload->>'externalUrl', ''),
    'PENDING',
    COALESCE(p_payload->>'visibility', 'personal'),
    v_user
  )
  RETURNING id INTO v_doc;

  RETURN v_doc;
END;
$$;

CREATE OR REPLACE FUNCTION sol_add_knowledge_document_version(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc uuid := (p_payload->>'documentId')::uuid;
  v_tenant uuid;
  v_user uuid := NULLIF(p_payload->>'createdByUserId', '')::uuid;
  v_ver uuid;
  v_num int := COALESCE((p_payload->>'version')::int, 1);
BEGIN
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'documentId required';
  END IF;

  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
  FROM knowledge_documents
  WHERE id = v_doc AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', v_doc;
  END IF;

  INSERT INTO knowledge_document_versions (
    document_id,
    tenant_id,
    version,
    s3_key,
    checksum,
    byte_size,
    mime_type,
    created_by_user_id
  ) VALUES (
    v_doc,
    v_tenant,
    v_num,
    NULLIF(p_payload->>'s3Key', ''),
    NULLIF(p_payload->>'checksum', ''),
    NULLIF(p_payload->>'byteSize', '')::int,
    NULLIF(p_payload->>'mimeType', ''),
    v_user
  )
  RETURNING id INTO v_ver;

  UPDATE knowledge_documents
  SET
    current_version_id = v_ver,
    mime_type = COALESCE(NULLIF(p_payload->>'mimeType', ''), mime_type),
    byte_size = COALESCE(NULLIF(p_payload->>'byteSize', '')::int, byte_size),
    status = 'PENDING',
    error_message = NULL,
    updated_at = now()
  WHERE id = v_doc;

  RETURN v_ver;
END;
$$;

CREATE OR REPLACE FUNCTION sol_set_knowledge_document_visibility(
  p_document_id uuid,
  p_visibility text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE knowledge_documents
  SET visibility = p_visibility, updated_at = now()
  WHERE id = p_document_id
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sol_soft_delete_knowledge_document(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE knowledge_documents
  SET deleted_at = now(), updated_at = now()
  WHERE id = p_document_id
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sol_update_quiz(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_id uuid := (p_payload->>'quizId')::uuid;
  v_tenant uuid;
  v_offering uuid;
  v_q jsonb;
  v_section uuid;
  v_order int := 0;
  v_existing_ids uuid[] := ARRAY[]::uuid[];
  v_keep_ids uuid[] := ARRAY[]::uuid[];
  v_qid uuid;
BEGIN
  IF v_quiz_id IS NULL THEN
    RAISE EXCEPTION 'quizId required';
  END IF;

  SELECT tenant_id, offering_id INTO v_tenant, v_offering
  FROM quizzes
  WHERE id = v_quiz_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found: %', v_quiz_id;
  END IF;

  UPDATE quizzes
  SET
    title = COALESCE(NULLIF(trim(p_payload->>'title'), ''), title),
    description = NULLIF(p_payload->>'description', ''),
    max_attempts = COALESCE((p_payload->>'maxAttempts')::int, max_attempts),
    time_limit = NULLIF(p_payload->>'timeLimit', '')::int,
    passing_score = COALESCE((p_payload->>'passingScore')::int, passing_score),
    start_date = NULLIF(p_payload->>'startDate', '')::timestamptz,
    end_date = NULLIF(p_payload->>'endDate', '')::timestamptz,
    is_active = COALESCE((p_payload->>'isActive')::boolean, is_active),
    updated_at = now()
  WHERE id = v_quiz_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_existing_ids
  FROM questions
  WHERE quiz_id = v_quiz_id;

  FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'questions', '[]'::jsonb))
  LOOP
    v_qid := NULLIF(v_q->>'id', '')::uuid;
    IF v_qid IS NOT NULL AND v_qid = ANY (v_existing_ids) THEN
      UPDATE questions
      SET
        type = COALESCE(v_q->>'type', type),
        question = COALESCE(v_q->>'question', question),
        options = COALESCE(v_q->'options', options),
        correct_answer = NULLIF(v_q->>'correctAnswer', ''),
        points = COALESCE((v_q->>'points')::int, points),
        "order" = COALESCE((v_q->>'order')::int, v_order),
        concept_tags = COALESCE(v_q->'conceptTags', concept_tags)
      WHERE id = v_qid;
      v_keep_ids := array_append(v_keep_ids, v_qid);
    ELSE
      INSERT INTO questions (
        quiz_id, tenant_id, offering_id, type, question, options,
        correct_answer, points, "order", concept_tags
      ) VALUES (
        v_quiz_id,
        v_tenant,
        v_offering,
        COALESCE(v_q->>'type', 'MULTIPLE_CHOICE'),
        COALESCE(v_q->>'question', ''),
        v_q->'options',
        NULLIF(v_q->>'correctAnswer', ''),
        COALESCE((v_q->>'points')::int, 1),
        COALESCE((v_q->>'order')::int, v_order),
        COALESCE(v_q->'conceptTags', '[]'::jsonb)
      )
      RETURNING id INTO v_qid;
      v_keep_ids := array_append(v_keep_ids, v_qid);
    END IF;
    v_order := v_order + 1;
  END LOOP;

  IF COALESCE(jsonb_array_length(p_payload->'questions'), 0) > 0 THEN
    DELETE FROM questions
    WHERE quiz_id = v_quiz_id
      AND NOT (id = ANY (v_keep_ids));
  END IF;

  IF p_payload ? 'sectionIds' THEN
    DELETE FROM quiz_sections WHERE quiz_id = v_quiz_id;
    FOR v_section IN
      SELECT (jsonb_array_elements_text(p_payload->'sectionIds'))::uuid
    LOOP
      INSERT INTO quiz_sections (
        quiz_id, section_id, tenant_id, offering_id, assigned_by
      ) VALUES (
        v_quiz_id,
        v_section,
        v_tenant,
        v_offering,
        NULLIF(p_payload->>'assignedBy', '')::uuid
      );
    END LOOP;
  END IF;

  UPDATE course_activities
  SET
    title = COALESCE(NULLIF(trim(p_payload->>'title'), ''), title),
    description = NULLIF(p_payload->>'description', ''),
    start_date = NULLIF(p_payload->>'startDate', '')::timestamptz,
    end_date = NULLIF(p_payload->>'endDate', '')::timestamptz,
    is_active = COALESCE((p_payload->>'isActive')::boolean, is_active),
    tenant_id = COALESCE(tenant_id, v_tenant),
    updated_at = now()
  WHERE quiz_id = v_quiz_id
    AND deleted_at IS NULL;

  RETURN v_quiz_id;
END;
$$;

REVOKE ALL ON FUNCTION sol_create_knowledge_document(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_add_knowledge_document_version(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_knowledge_document_visibility(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_soft_delete_knowledge_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_update_quiz(jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_create_knowledge_document(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_add_knowledge_document_version(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_knowledge_document_visibility(uuid, text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_soft_delete_knowledge_document(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_update_quiz(jsonb) TO sol_app;
  END IF;
END
$$;
