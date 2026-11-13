-- More FORCE RLS write helpers for grades, invites, roster, knowledge links,
-- authoring policy/restore. Neon drops transaction-local app.tenant_id GUCs.

-- ── Grades ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_insert_grade_override(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt uuid := (p_payload->>'attemptId')::uuid;
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_question uuid := NULLIF(p_payload->>'questionId', '')::uuid;
  v_actor uuid := (p_payload->>'actorUserId')::uuid;
  v_note text := trim(COALESCE(p_payload->>'note', ''));
  v_row grade_overrides%ROWTYPE;
BEGIN
  IF v_attempt IS NULL OR v_tenant IS NULL OR v_actor IS NULL THEN
    RAISE EXCEPTION 'attemptId, tenantId, actorUserId required';
  END IF;
  IF v_note = '' THEN
    RAISE EXCEPTION 'note required';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  INSERT INTO grade_overrides (
    attempt_id, tenant_id, question_id, numeric_score,
    criteria_overrides, note, actor_user_id
  ) VALUES (
    v_attempt,
    v_tenant,
    v_question,
    CASE WHEN p_payload ? 'numericScore' AND p_payload->>'numericScore' IS NOT NULL
      THEN (p_payload->>'numericScore')::integer ELSE NULL END,
    CASE WHEN p_payload ? 'criteriaOverrides' THEN p_payload->'criteriaOverrides' ELSE NULL END,
    v_note,
    v_actor
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'attemptId', v_row.attempt_id,
    'tenantId', v_row.tenant_id,
    'questionId', v_row.question_id,
    'numericScore', v_row.numeric_score,
    'criteriaOverrides', v_row.criteria_overrides,
    'note', v_row.note,
    'actorUserId', v_row.actor_user_id,
    'createdAt', v_row.created_at
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_grade_overrides(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM attempts WHERE id = p_attempt_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', g.id,
      'attemptId', g.attempt_id,
      'tenantId', g.tenant_id,
      'questionId', g.question_id,
      'numericScore', g.numeric_score,
      'criteriaOverrides', g.criteria_overrides,
      'note', g.note,
      'actorUserId', g.actor_user_id,
      'createdAt', g.created_at
    ) ORDER BY g.created_at ASC)
    FROM grade_overrides g
    WHERE g.attempt_id = p_attempt_id
  ), '[]'::jsonb);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_update_attempt_score(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt uuid := (p_payload->>'attemptId')::uuid;
  v_tenant uuid;
BEGIN
  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'attemptId required';
  END IF;
  SELECT tenant_id INTO v_tenant FROM attempts WHERE id = v_attempt;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE attempts SET
    score = (p_payload->>'score')::integer,
    max_score = (p_payload->>'maxScore')::integer,
    percentage = (p_payload->>'percentage')::integer,
    passed = (p_payload->>'passed')::boolean
  WHERE id = v_attempt;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_quiz_grades_released(
  p_quiz_id uuid,
  p_released_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
  v_released timestamptz;
BEGIN
  SELECT tenant_id INTO v_tenant FROM quizzes WHERE id = p_quiz_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE quizzes
  SET grades_released_at = p_released_at, updated_at = now()
  WHERE id = p_quiz_id
  RETURNING id, grades_released_at INTO v_id, v_released;
  RETURN jsonb_build_object('id', v_id, 'gradesReleasedAt', v_released);
END;
$$;

-- ── Invites (mint) ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_create_workspace_invite(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_email text := lower(trim(COALESCE(p_payload->>'email', '')));
  v_role text := COALESCE(NULLIF(trim(p_payload->>'role'), ''), 'owner');
  v_token_hash text := p_payload->>'tokenHash';
  v_expires timestamptz := (p_payload->>'expiresAt')::timestamptz;
  v_id uuid;
BEGIN
  IF v_workspace IS NULL OR v_email = '' OR v_token_hash IS NULL OR v_expires IS NULL THEN
    RAISE EXCEPTION 'workspaceId, email, tokenHash, expiresAt required';
  END IF;
  IF v_role NOT IN ('owner', 'admin', 'instructor') THEN
    RAISE EXCEPTION 'invalid invite role';
  END IF;

  PERFORM set_config('app.tenant_id', v_workspace::text, true);

  UPDATE workspace_invites
  SET expires_at = now()
  WHERE workspace_id = v_workspace
    AND lower(email) = v_email
    AND claimed_at IS NULL;

  INSERT INTO workspace_invites (workspace_id, email, role, token_hash, expires_at)
  VALUES (v_workspace, v_email, v_role, v_token_hash, v_expires)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'expiresAt', v_expires);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_create_student_invite(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_section uuid := (p_payload->>'sectionId')::uuid;
  v_email text := lower(trim(COALESCE(p_payload->>'email', '')));
  v_token_hash text := p_payload->>'tokenHash';
  v_invited_by uuid := NULLIF(p_payload->>'invitedBy', '')::uuid;
  v_expires timestamptz := (p_payload->>'expiresAt')::timestamptz;
  v_id uuid;
BEGIN
  IF v_tenant IS NULL OR v_section IS NULL OR v_email = '' OR v_token_hash IS NULL OR v_expires IS NULL THEN
    RAISE EXCEPTION 'tenantId, sectionId, email, tokenHash, expiresAt required';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE section_student_invites
  SET expires_at = now()
  WHERE section_id = v_section
    AND lower(email) = v_email
    AND claimed_at IS NULL;

  INSERT INTO section_student_invites (
    tenant_id, section_id, email, token_hash, invited_by, expires_at
  ) VALUES (
    v_tenant, v_section, v_email, v_token_hash, v_invited_by, v_expires
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'expiresAt', v_expires);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_create_staff_invite(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_section uuid := (p_payload->>'sectionId')::uuid;
  v_email text := lower(trim(COALESCE(p_payload->>'email', '')));
  v_role text := p_payload->>'role';
  v_token_hash text := p_payload->>'tokenHash';
  v_granted_by uuid := NULLIF(p_payload->>'grantedBy', '')::uuid;
  v_expires timestamptz := (p_payload->>'expiresAt')::timestamptz;
  v_id uuid;
BEGIN
  IF v_tenant IS NULL OR v_section IS NULL OR v_email = '' OR v_token_hash IS NULL OR v_expires IS NULL THEN
    RAISE EXCEPTION 'tenantId, sectionId, email, tokenHash, expiresAt required';
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('ta', 'grader') THEN
    RAISE EXCEPTION 'role must be ta|grader';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE section_staff_invites
  SET expires_at = now()
  WHERE section_id = v_section
    AND lower(email) = v_email
    AND claimed_at IS NULL;

  INSERT INTO section_staff_invites (
    tenant_id, section_id, email, role, token_hash, granted_by, expires_at
  ) VALUES (
    v_tenant, v_section, v_email, v_role, v_token_hash, v_granted_by, v_expires
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'expiresAt', v_expires);
END;
$$;

-- ── Roster / enrollment drop ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_drop_student_enrollment(p_enrollment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row student_sections%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM student_sections WHERE id = p_enrollment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found';
  END IF;
  IF v_row.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_row.tenant_id::text, true);
  END IF;
  IF v_row.status = 'DROPPED' THEN
    RAISE EXCEPTION 'ALREADY_DROPPED';
  END IF;
  UPDATE student_sections SET status = 'DROPPED' WHERE id = p_enrollment_id;
  RETURN jsonb_build_object(
    'id', v_row.id,
    'studentId', v_row.student_id,
    'sectionId', v_row.section_id,
    'offeringId', v_row.offering_id,
    'tenantId', v_row.tenant_id
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_apply_enrollment_source_removal(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student uuid := (p_payload->>'studentId')::uuid;
  v_section uuid := (p_payload->>'sectionId')::uuid;
  v_source text := p_payload->>'source';
  v_row student_sections%ROWTYPE;
  v_sources jsonb;
  v_next jsonb := '[]'::jsonb;
  v_elem text;
  v_offering uuid;
  v_still_active uuid;
BEGIN
  IF v_student IS NULL OR v_section IS NULL OR v_source IS NULL THEN
    RAISE EXCEPTION 'studentId, sectionId, source required';
  END IF;

  SELECT * INTO v_row
  FROM student_sections
  WHERE student_id = v_student AND section_id = v_section
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  IF v_row.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_row.tenant_id::text, true);
  END IF;

  FOR v_elem IN
    SELECT jsonb_array_elements_text(COALESCE(v_row.sources, '[]'::jsonb))
  LOOP
    IF v_elem IS DISTINCT FROM v_source THEN
      v_next := v_next || jsonb_build_array(v_elem);
    END IF;
  END LOOP;
  v_sources := v_next;

  IF jsonb_array_length(v_sources) = 0 THEN
    UPDATE student_sections
    SET status = 'DROPPED', sources = '[]'::jsonb
    WHERE id = v_row.id;
    v_offering := v_row.offering_id;
    IF v_offering IS NOT NULL THEN
      SELECT ss.id INTO v_still_active
      FROM student_sections ss
      WHERE ss.student_id = v_student
        AND ss.offering_id = v_offering
        AND ss.status = 'ACTIVE'
      LIMIT 1;
      IF v_still_active IS NULL THEN
        UPDATE student_offerings
        SET status = 'DROPPED', sources = '[]'::jsonb, updated_at = now()
        WHERE student_id = v_student AND offering_id = v_offering;
      END IF;
    END IF;
    RETURN 'dropped';
  END IF;

  UPDATE student_sections SET sources = v_sources WHERE id = v_row.id;
  RETURN 'active';
END;
$$;

-- ── Knowledge links ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_link_course_knowledge(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_document uuid := (p_payload->>'documentId')::uuid;
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_user uuid := NULLIF(p_payload->>'linkedByUserId', '')::uuid;
  v_corpus text := COALESCE(NULLIF(p_payload->>'authoringCorpus', ''), 'this_term');
  v_pinned uuid := NULLIF(p_payload->>'pinnedVersionId', '')::uuid;
  v_doc knowledge_documents%ROWTYPE;
BEGIN
  IF v_course IS NULL OR v_document IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'courseId, documentId, tenantId required';
  END IF;
  IF v_corpus NOT IN ('prior_course', 'this_term') THEN
    RAISE EXCEPTION 'invalid authoringCorpus';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT * INTO v_doc
  FROM knowledge_documents
  WHERE id = v_document
    AND workspace_id = v_tenant
    AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found in workspace library';
  END IF;
  IF v_doc.visibility = 'personal' THEN
    RAISE EXCEPTION 'Share this document to the library before attaching it to a course';
  END IF;
  v_pinned := COALESCE(v_pinned, v_doc.current_version_id);
  IF v_pinned IS NULL THEN
    RAISE EXCEPTION 'Document has no indexed version yet';
  END IF;

  INSERT INTO course_knowledge_links (
    course_id, document_id, tenant_id, linked_by_user_id,
    authoring_corpus, pinned_version_id, updated_at
  ) VALUES (
    v_course, v_document, v_tenant, v_user, v_corpus, v_pinned, now()
  )
  ON CONFLICT DO NOTHING;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_unlink_course_knowledge(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_document uuid := (p_payload->>'documentId')::uuid;
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
BEGIN
  IF v_course IS NULL OR v_document IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'courseId, documentId, tenantId required';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  DELETE FROM course_knowledge_links
  WHERE course_id = v_course AND document_id = v_document;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_course_knowledge_corpus(p_payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_document uuid := (p_payload->>'documentId')::uuid;
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_corpus text := p_payload->>'authoringCorpus';
  v_count integer;
BEGIN
  IF v_course IS NULL OR v_document IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'courseId, documentId, tenantId required';
  END IF;
  IF v_corpus IS NULL OR v_corpus NOT IN ('prior_course', 'this_term') THEN
    RAISE EXCEPTION 'invalid authoringCorpus';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  UPDATE course_knowledge_links
  SET authoring_corpus = v_corpus, updated_at = now()
  WHERE course_id = v_course AND document_id = v_document;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_accept_course_knowledge_update(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_document uuid := (p_payload->>'documentId')::uuid;
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_link course_knowledge_links%ROWTYPE;
BEGIN
  IF v_course IS NULL OR v_document IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'courseId, documentId, tenantId required';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT * INTO v_link
  FROM course_knowledge_links
  WHERE course_id = v_course AND document_id = v_document;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document is not attached to this course';
  END IF;
  IF v_link.update_available_version_id IS NULL THEN
    RAISE EXCEPTION 'No update available for this attachment';
  END IF;
  UPDATE course_knowledge_links SET
    pinned_version_id = v_link.update_available_version_id,
    update_available_version_id = NULL,
    update_noticed_at = NULL,
    updated_at = now()
  WHERE id = v_link.id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_dismiss_course_knowledge_update(p_payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_document uuid := (p_payload->>'documentId')::uuid;
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_count integer;
BEGIN
  IF v_course IS NULL OR v_document IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'courseId, documentId, tenantId required';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  UPDATE course_knowledge_links SET
    update_available_version_id = NULL,
    update_noticed_at = NULL,
    updated_at = now()
  WHERE course_id = v_course
    AND document_id = v_document
    AND update_available_version_id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_notify_course_knowledge_version(
  p_document_id uuid,
  p_new_version_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, tenant_id
    FROM course_knowledge_links
    WHERE document_id = p_document_id
      AND (
        pinned_version_id IS NULL
        OR pinned_version_id IS DISTINCT FROM p_new_version_id
      )
  LOOP
    IF r.tenant_id IS NOT NULL THEN
      PERFORM set_config('app.tenant_id', r.tenant_id::text, true);
    END IF;
    UPDATE course_knowledge_links SET
      update_available_version_id = p_new_version_id,
      update_noticed_at = now(),
      updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- ── Authoring policy + restore ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_get_authoring_policy(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_row authoring_policies%ROWTYPE;
BEGIN
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);
  SELECT * INTO v_row
  FROM authoring_policies
  WHERE workspace_id = p_workspace_id
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', v_row.id,
    'workspaceId', v_row.workspace_id,
    'structureNotes', v_row.structure_notes,
    'rubricStyle', v_row.rubric_style,
    'tone', v_row.tone,
    'extraPrompt', v_row.extra_prompt,
    'updatedAt', v_row.updated_at
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_authoring_policy(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_existing authoring_policies%ROWTYPE;
  v_row authoring_policies%ROWTYPE;
BEGIN
  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'workspaceId required';
  END IF;
  PERFORM set_config('app.tenant_id', v_workspace::text, true);

  SELECT * INTO v_existing
  FROM authoring_policies
  WHERE workspace_id = v_workspace
  LIMIT 1;

  IF FOUND THEN
    UPDATE authoring_policies SET
      structure_notes = CASE WHEN p_payload ? 'structureNotes' THEN NULLIF(p_payload->>'structureNotes', '') ELSE structure_notes END,
      rubric_style = CASE WHEN p_payload ? 'rubricStyle' THEN NULLIF(p_payload->>'rubricStyle', '') ELSE rubric_style END,
      tone = CASE WHEN p_payload ? 'tone' THEN NULLIF(p_payload->>'tone', '') ELSE tone END,
      extra_prompt = CASE WHEN p_payload ? 'extraPrompt' THEN NULLIF(p_payload->>'extraPrompt', '') ELSE extra_prompt END,
      updated_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO authoring_policies (
      workspace_id, tenant_id, structure_notes, rubric_style, tone, extra_prompt
    ) VALUES (
      v_workspace,
      v_workspace,
      NULLIF(p_payload->>'structureNotes', ''),
      NULLIF(p_payload->>'rubricStyle', ''),
      NULLIF(p_payload->>'tone', ''),
      NULLIF(p_payload->>'extraPrompt', '')
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'workspaceId', v_row.workspace_id,
    'structureNotes', v_row.structure_notes,
    'rubricStyle', v_row.rubric_style,
    'tone', v_row.tone,
    'extraPrompt', v_row.extra_prompt,
    'updatedAt', v_row.updated_at
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_restore_authoring_snapshot(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outline uuid := (p_payload->>'outlineId')::uuid;
  v_tenant uuid;
  v_snap jsonb := p_payload->'snapshot';
  v_mod jsonb;
  v_item jsonb;
BEGIN
  IF v_outline IS NULL OR v_snap IS NULL THEN
    RAISE EXCEPTION 'outlineId and snapshot required';
  END IF;
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
  FROM course_outlines WHERE id = v_outline AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Outline not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOR v_mod IN SELECT * FROM jsonb_array_elements(COALESCE(v_snap->'modules', '[]'::jsonb))
  LOOP
    UPDATE outline_modules SET
      title = COALESCE(v_mod->>'title', title),
      summary = CASE WHEN v_mod ? 'summary' THEN NULLIF(v_mod->>'summary', '') ELSE summary END,
      position = COALESCE((v_mod->>'position')::integer, position),
      updated_at = now()
    WHERE id = (v_mod->>'id')::uuid AND outline_id = v_outline;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_mod->'items', '[]'::jsonb))
    LOOP
      UPDATE outline_items SET
        title = COALESCE(v_item->>'title', title),
        type = COALESCE(v_item->>'type', type),
        status = COALESCE(v_item->>'status', status),
        position = COALESCE((v_item->>'position')::integer, position),
        body = COALESCE(v_item->'body', body),
        faithful_body = CASE WHEN v_item ? 'faithfulBody' THEN v_item->'faithfulBody' ELSE faithful_body END,
        variant_of_item_id = CASE
          WHEN v_item ? 'variantOfItemId' THEN NULLIF(v_item->>'variantOfItemId', '')::uuid
          ELSE variant_of_item_id
        END,
        updated_at = now()
      WHERE id = (v_item->>'id')::uuid AND deleted_at IS NULL;
    END LOOP;
  END LOOP;

  UPDATE course_outlines SET
    title = COALESCE(NULLIF(v_snap->>'title', ''), title),
    status = COALESCE(NULLIF(v_snap->>'status', ''), status),
    bodies_built = COALESCE((v_snap->>'bodiesBuilt')::boolean, bodies_built),
    has_prior_corpus = COALESCE((v_snap->>'hasPriorCorpus')::boolean, has_prior_corpus),
    updated_at = now()
  WHERE id = v_outline;
END;
$$;

-- Grants
REVOKE ALL ON FUNCTION sol_insert_grade_override(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_list_grade_overrides(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_update_attempt_score(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_quiz_grades_released(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_workspace_invite(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_student_invite(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_staff_invite(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_drop_student_enrollment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_apply_enrollment_source_removal(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_link_course_knowledge(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_unlink_course_knowledge(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_course_knowledge_corpus(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_accept_course_knowledge_update(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_dismiss_course_knowledge_update(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_notify_course_knowledge_version(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_get_authoring_policy(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_upsert_authoring_policy(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_restore_authoring_snapshot(jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_insert_grade_override(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_list_grade_overrides(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_update_attempt_score(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_quiz_grades_released(uuid, timestamptz) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_create_workspace_invite(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_create_student_invite(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_create_staff_invite(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_drop_student_enrollment(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_apply_enrollment_source_removal(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_link_course_knowledge(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_unlink_course_knowledge(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_course_knowledge_corpus(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_accept_course_knowledge_update(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_dismiss_course_knowledge_update(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_notify_course_knowledge_version(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_get_authoring_policy(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_upsert_authoring_policy(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_restore_authoring_snapshot(jsonb) TO sol_app;
  END IF;
END
$$;
