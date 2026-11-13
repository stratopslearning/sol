-- Workspace/staff invite token lookup + atomic claim under FORCE RLS.
-- Harden quiz section assign + knowledge chunk insert tenant checks.

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_find_workspace_invite_by_token(p_token_hash text)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  email text,
  role text,
  token_hash text,
  expires_at timestamptz,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  created_at timestamptz,
  workspace_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.workspace_id, i.email, i.role, i.token_hash,
    i.expires_at, i.claimed_at, i.claimed_by_user_id, i.created_at,
    w.name AS workspace_name
  FROM workspace_invites i
  LEFT JOIN workspaces w ON w.id = i.workspace_id
  WHERE i.token_hash = p_token_hash
  LIMIT 1;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_find_workspace_invite_by_token(text) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION sol_claim_workspace_invite(
  p_token_hash text,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  email text,
  role text,
  expires_at timestamptz,
  workspace_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE workspace_invites i
  SET
    claimed_at = now(),
    claimed_by_user_id = p_user_id
  FROM workspaces w
  WHERE i.token_hash = p_token_hash
    AND i.claimed_at IS NULL
    AND i.expires_at > now()
    AND w.id = i.workspace_id
  RETURNING
    i.id, i.workspace_id, i.email, i.role, i.expires_at, w.name;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_claim_workspace_invite(text, uuid) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION sol_find_staff_invite_by_token(p_token_hash text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  section_id uuid,
  email text,
  role text,
  token_hash text,
  granted_by uuid,
  expires_at timestamptz,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.tenant_id, i.section_id, i.email, i.role, i.token_hash,
    i.granted_by, i.expires_at, i.claimed_at, i.claimed_by_user_id, i.created_at
  FROM section_staff_invites i
  WHERE i.token_hash = p_token_hash
  LIMIT 1;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_find_staff_invite_by_token(text) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION sol_claim_staff_invite(
  p_token_hash text,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  section_id uuid,
  email text,
  role text,
  granted_by uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE section_staff_invites i
  SET
    claimed_at = now(),
    claimed_by_user_id = p_user_id
  WHERE i.token_hash = p_token_hash
    AND i.claimed_at IS NULL
    AND i.expires_at > now()
  RETURNING
    i.id, i.tenant_id, i.section_id, i.email, i.role, i.granted_by, i.expires_at;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_claim_staff_invite(text, uuid) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION sol_claim_student_invite(
  p_token_hash text,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  section_id uuid,
  email text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE section_student_invites i
  SET
    claimed_at = now(),
    claimed_by_user_id = p_user_id
  WHERE i.token_hash = p_token_hash
    AND i.claimed_at IS NULL
    AND i.expires_at > now()
  RETURNING
    i.id, i.tenant_id, i.section_id, i.email, i.expires_at;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_claim_student_invite(text, uuid) FROM PUBLIC;
--> statement-breakpoint

-- Reject cross-tenant sectionIds on quiz assign / set.
CREATE OR REPLACE FUNCTION sol_set_quiz_sections(p_payload jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz uuid := (p_payload->>'quizId')::uuid;
  v_assigned_by uuid := (p_payload->>'assignedBy')::uuid;
  v_tenant uuid;
  v_ids uuid[];
  v_bad int;
BEGIN
  SELECT tenant_id INTO v_tenant FROM quizzes WHERE id = v_quiz AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT count(*)::int INTO v_bad
  FROM unnest(
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_payload->'sectionIds', '[]'::jsonb)
        )::uuid
      ),
      ARRAY[]::uuid[]
    )
  ) AS sid
  LEFT JOIN sections s ON s.id = sid
  WHERE s.id IS NULL
     OR COALESCE(s.tenant_id, s.workspace_id) IS DISTINCT FROM v_tenant;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Section tenant mismatch for quiz assignment';
  END IF;

  DELETE FROM quiz_sections WHERE quiz_id = v_quiz;

  INSERT INTO quiz_sections (quiz_id, section_id, assigned_by, tenant_id)
  SELECT v_quiz, sid, v_assigned_by, v_tenant
  FROM unnest(
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_payload->'sectionIds', '[]'::jsonb)
        )::uuid
      ),
      ARRAY[]::uuid[]
    )
  ) AS sid;

  SELECT array_agg(section_id) INTO v_ids
  FROM quiz_sections WHERE quiz_id = v_quiz;
  RETURN COALESCE(v_ids, ARRAY[]::uuid[]);
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
  v_sec_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM quizzes WHERE id = v_quiz AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOR v_section IN
    SELECT (jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb)))::uuid
  LOOP
    SELECT COALESCE(s.tenant_id, s.workspace_id) INTO v_sec_tenant
    FROM sections s WHERE s.id = v_section;
    IF v_sec_tenant IS NULL OR v_sec_tenant IS DISTINCT FROM v_tenant THEN
      RAISE EXCEPTION 'Section tenant mismatch for quiz assignment';
    END IF;
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

-- Resolve tenant/workspace from document; ignore mismatched payload ids.
CREATE OR REPLACE FUNCTION sol_insert_knowledge_chunks(p_payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document uuid := (p_payload->>'documentId')::uuid;
  v_version uuid := (p_payload->>'versionId')::uuid;
  v_workspace uuid;
  v_tenant uuid;
  v_chunk jsonb;
  v_count int := 0;
  v_embedding text;
BEGIN
  IF v_document IS NULL OR v_version IS NULL THEN
    RAISE EXCEPTION 'documentId and versionId required';
  END IF;

  SELECT COALESCE(d.tenant_id, d.workspace_id), d.workspace_id
  INTO v_tenant, v_workspace
  FROM knowledge_documents d
  WHERE d.id = v_document;

  IF v_tenant IS NULL OR v_workspace IS NULL THEN
    RAISE EXCEPTION 'Document not found or missing tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM knowledge_document_versions v
    WHERE v.id = v_version AND v.document_id = v_document
  ) THEN
    RAISE EXCEPTION 'Version does not belong to document';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOR v_chunk IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'chunks', '[]'::jsonb))
  LOOP
    v_embedding := v_chunk->>'embedding';
    INSERT INTO knowledge_chunks (
      document_id, version_id, workspace_id, tenant_id,
      chunk_index, content, token_count, embedding
    ) VALUES (
      v_document,
      v_version,
      v_workspace,
      v_tenant,
      COALESCE((v_chunk->>'chunkIndex')::int, (v_chunk->>'index')::int, 0),
      COALESCE(v_chunk->>'content', ''),
      COALESCE((v_chunk->>'tokenCount')::int, 0),
      CASE
        WHEN v_embedding IS NULL OR v_embedding = '' THEN NULL
        ELSE v_embedding::vector
      END
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_find_workspace_invite_by_token(text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_claim_workspace_invite(text, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_find_staff_invite_by_token(text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_claim_staff_invite(text, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_claim_student_invite(text, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_quiz_sections(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_assign_quiz_sections(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_insert_knowledge_chunks(jsonb) TO sol_app;
  END IF;
END $$;
