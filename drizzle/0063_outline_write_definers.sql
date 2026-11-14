-- Outline write DEFINER helpers used by TS (were live on Neon but missing from repo).

CREATE OR REPLACE FUNCTION sol_persist_course_outline(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := (p_payload->>'tenantId')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_user uuid := (p_payload->>'createdByUserId')::uuid;
  v_outline uuid;
  v_module jsonb;
  v_module_id uuid;
  v_item jsonb;
  v_mi int := 0;
  v_ii int;
  v_user_msg text := COALESCE(NULLIF(trim(p_payload->>'userMessage'), ''), 'Propose an outline');
  v_asst_msg text := COALESCE(NULLIF(trim(p_payload->>'assistantMessage'), ''), 'Outline ready');
BEGIN
  IF v_tenant IS NULL OR v_course IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'tenantId, courseId, createdByUserId required';
  END IF;

  UPDATE course_outlines
  SET status = 'ARCHIVED', updated_at = now()
  WHERE course_id = v_course
    AND deleted_at IS NULL
    AND status <> 'ARCHIVED';

  INSERT INTO course_outlines (
    course_id, tenant_id, created_by_user_id, title, status, brief,
    has_prior_corpus, bodies_built
  ) VALUES (
    v_course,
    v_tenant,
    v_user,
    COALESCE(p_payload->>'title', 'Course outline'),
    COALESCE(p_payload->>'status', 'DRAFT'),
    NULLIF(p_payload->>'brief', ''),
    COALESCE((p_payload->>'hasPriorCorpus')::boolean, false),
    COALESCE((p_payload->>'bodiesBuilt')::boolean, false)
  )
  RETURNING id INTO v_outline;

  FOR v_module IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'modules', '[]'::jsonb))
  LOOP
    INSERT INTO outline_modules (outline_id, tenant_id, title, summary, position)
    VALUES (
      v_outline,
      v_tenant,
      COALESCE(v_module->>'title', 'Module'),
      NULLIF(v_module->>'summary', ''),
      v_mi
    )
    RETURNING id INTO v_module_id;

    v_ii := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_module->'items', '[]'::jsonb))
    LOOP
      INSERT INTO outline_items (
        module_id, tenant_id, type, title, status, body, source_material_ids, position
      ) VALUES (
        v_module_id,
        v_tenant,
        COALESCE(v_item->>'type', 'QUIZ'),
        COALESCE(v_item->>'title', 'Item'),
        'DRAFT',
        COALESCE(v_item->'body', '{}'::jsonb),
        COALESCE(v_item->'sourceMaterialIds', '[]'::jsonb),
        v_ii
      );
      v_ii := v_ii + 1;
    END LOOP;
    v_mi := v_mi + 1;
  END LOOP;

  INSERT INTO authoring_messages (outline_id, tenant_id, role, content) VALUES
    (v_outline, v_tenant, 'user', v_user_msg),
    (v_outline, v_tenant, 'assistant', v_asst_msg);

  RETURN v_outline;
END;
$$;

CREATE OR REPLACE FUNCTION sol_apply_outline_build(
  p_outline_id uuid,
  p_patches jsonb,
  p_has_prior_corpus boolean DEFAULT false,
  p_ai_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patch jsonb;
BEGIN
  FOR v_patch IN SELECT * FROM jsonb_array_elements(COALESCE(p_patches, '[]'::jsonb))
  LOOP
    UPDATE outline_items
    SET
      title = COALESCE(NULLIF(v_patch->>'title', ''), title),
      body = COALESCE(v_patch->'body', body),
      faithful_body = COALESCE(v_patch->'body', faithful_body),
      source_material_ids = COALESCE(v_patch->'sourceMaterialIds', source_material_ids),
      review_status = 'pending',
      ai_meta = COALESCE(p_ai_meta, ai_meta),
      updated_at = now()
    WHERE id = (v_patch->>'itemId')::uuid
      AND deleted_at IS NULL;
  END LOOP;

  UPDATE course_outlines
  SET
    status = 'READY',
    bodies_built = true,
    has_prior_corpus = COALESCE(p_has_prior_corpus, has_prior_corpus),
    updated_at = now()
  WHERE id = p_outline_id
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sol_insert_authoring_revision(
  p_outline_id uuid,
  p_tenant_id uuid,
  p_user_id uuid,
  p_label text,
  p_snapshot jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_tenant uuid := COALESCE(
    p_tenant_id,
    (SELECT tenant_id FROM course_outlines WHERE id = p_outline_id)
  );
BEGIN
  INSERT INTO authoring_revisions (outline_id, tenant_id, created_by_user_id, label, snapshot)
  VALUES (p_outline_id, v_tenant, p_user_id, left(p_label, 200), p_snapshot)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION sol_persist_course_outline(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_apply_outline_build(uuid, jsonb, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_insert_authoring_revision(uuid, uuid, uuid, text, jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_persist_course_outline(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_apply_outline_build(uuid, jsonb, boolean, jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_insert_authoring_revision(uuid, uuid, uuid, text, jsonb) TO sol_app;
  END IF;
END
$$;
