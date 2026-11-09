-- Admin purge, workspace access-requests, entitlement license patches under FORCE RLS.

-- ── Admin hard purge ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_admin_fetch_course(p_course_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT to_jsonb(c.*) FROM courses c WHERE c.id = p_course_id;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_purge_course(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant FROM courses WHERE id = p_course_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Course not found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  DELETE FROM courses WHERE id = p_course_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_fetch_section(p_section_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT to_jsonb(s.*) FROM sections s WHERE s.id = p_section_id;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_purge_section(p_section_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant FROM sections WHERE id = p_section_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Section not found'; END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  DELETE FROM sections WHERE id = p_section_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_fetch_quiz(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT to_jsonb(q.*) FROM quizzes q WHERE q.id = p_quiz_id;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_purge_quiz(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  DELETE FROM quizzes WHERE id = p_quiz_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_reassign_user_content(
  p_from_user uuid,
  p_to_user uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE quiz_sections SET assigned_by = p_to_user WHERE assigned_by = p_from_user;
  UPDATE chatbot_sections SET assigned_by = p_to_user WHERE assigned_by = p_from_user;
  UPDATE quizzes SET professor_id = p_to_user, updated_at = now() WHERE professor_id = p_from_user;
  UPDATE chatbots SET professor_id = p_to_user, updated_at = now() WHERE professor_id = p_from_user;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM users WHERE id = p_user_id;
END;
$$;

-- ── Access requests ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_create_access_request(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_email text := lower(trim(COALESCE(p_payload->>'email', '')));
  v_name text := NULLIF(trim(COALESCE(p_payload->>'name', '')), '');
  v_role text := COALESCE(NULLIF(p_payload->>'claimedRole', ''), 'instructor');
  v_user uuid := NULLIF(p_payload->>'userId', '')::uuid;
  v_existing uuid;
  v_id uuid;
BEGIN
  IF v_workspace IS NULL OR v_email = '' OR NOT (v_email LIKE '%@%') THEN
    RAISE EXCEPTION 'workspaceId and valid email required';
  END IF;
  IF v_role NOT IN ('instructor', 'admin') THEN
    RAISE EXCEPTION 'invalid claimedRole';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = v_workspace) THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  PERFORM set_config('app.tenant_id', v_workspace::text, true);

  SELECT id INTO v_existing
  FROM workspace_access_requests
  WHERE workspace_id = v_workspace
    AND lower(email) = v_email
    AND status = 'pending'
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_existing);
  END IF;

  INSERT INTO workspace_access_requests (
    workspace_id, email, name, claimed_role, user_id, status
  ) VALUES (
    v_workspace, v_email, v_name, v_role, v_user, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_pending_access_requests(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC)
    FROM (
      SELECT * FROM workspace_access_requests
      WHERE workspace_id = p_workspace_id AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 100
    ) r
  ), '[]'::jsonb);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_fetch_access_request(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_id uuid := (p_payload->>'requestId')::uuid;
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
BEGIN
  PERFORM set_config('app.tenant_id', v_workspace::text, true);
  RETURN (
    SELECT to_jsonb(r.*)
    FROM workspace_access_requests r
    WHERE r.id = v_id AND r.workspace_id = v_workspace
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_decide_access_request(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid := (p_payload->>'requestId')::uuid;
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_status text := p_payload->>'status';
  v_actor uuid := (p_payload->>'decidedBy')::uuid;
  v_note text := NULLIF(trim(COALESCE(p_payload->>'note', '')), '');
BEGIN
  IF v_status IS NULL OR v_status NOT IN ('approved', 'rejected', 'blocked') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  PERFORM set_config('app.tenant_id', v_workspace::text, true);
  UPDATE workspace_access_requests SET
    status = v_status,
    decided_by = v_actor,
    decided_at = now(),
    note = v_note,
    updated_at = now()
  WHERE id = v_id AND workspace_id = v_workspace;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_find_workspace_id_by_slug(p_slug text)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT id FROM workspaces
  WHERE lower(slug) = lower(trim(p_slug))
  LIMIT 1;
$$;

-- ── Entitlement license patches ────────────────────────────────────────

CREATE OR REPLACE FUNCTION sol_grant_workspace_comp_access(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_indefinite boolean := COALESCE((p_payload->>'indefinite')::boolean, false);
  v_days integer := COALESCE((p_payload->>'days')::integer, 30);
  v_start timestamptz := now();
  v_end timestamptz;
  v_license uuid;
BEGIN
  IF v_workspace IS NULL THEN RAISE EXCEPTION 'workspaceId required'; END IF;
  PERFORM set_config('app.tenant_id', v_workspace::text, true);

  SELECT id INTO v_license
  FROM workspace_licenses
  WHERE workspace_id = v_workspace
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_license IS NULL THEN
    RAISE EXCEPTION 'Workspace has no license row';
  END IF;

  IF v_indefinite THEN
    v_end := NULL;
  ELSE
    v_days := GREATEST(1, LEAST(v_days, 365));
    v_end := v_start + make_interval(days => v_days);
  END IF;

  UPDATE workspace_licenses SET
    status = 'trialing',
    period_start = v_start,
    period_end = v_end,
    updated_at = v_start
  WHERE id = v_license;

  UPDATE workspaces SET status = 'trial', updated_at = v_start
  WHERE id = v_workspace;

  RETURN jsonb_build_object(
    'periodStart', v_start,
    'periodEnd', v_end
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_revoke_workspace_comp_access(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_license workspace_licenses%ROWTYPE;
  v_revoked timestamptz := now();
BEGIN
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);

  SELECT * INTO v_license
  FROM workspace_licenses
  WHERE workspace_id = p_workspace_id
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace has no license row';
  END IF;

  IF v_license.status = 'active'
     AND v_license.stripe_subscription_id IS NOT NULL
     AND v_license.billing_provider = 'stripe' THEN
    RAISE EXCEPTION 'STRIPE_ACTIVE_SUBSCRIPTION';
  END IF;

  UPDATE workspace_licenses SET
    status = 'canceled',
    period_end = v_revoked,
    updated_at = v_revoked
  WHERE id = v_license.id;

  UPDATE workspaces SET status = 'suspended', updated_at = v_revoked
  WHERE id = p_workspace_id;

  RETURN jsonb_build_object('revokedAt', v_revoked);
END;
$$;

REVOKE ALL ON FUNCTION sol_admin_fetch_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_purge_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_fetch_section(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_purge_section(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_fetch_quiz(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_purge_quiz(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_reassign_user_content(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_delete_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_create_access_request(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_list_pending_access_requests(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_fetch_access_request(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_decide_access_request(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_find_workspace_id_by_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_grant_workspace_comp_access(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_revoke_workspace_comp_access(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_admin_fetch_course(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_purge_course(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_fetch_section(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_purge_section(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_fetch_quiz(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_purge_quiz(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_reassign_user_content(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_delete_user(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_create_access_request(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_list_pending_access_requests(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_fetch_access_request(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_decide_access_request(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_find_workspace_id_by_slug(text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_grant_workspace_comp_access(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_revoke_workspace_comp_access(uuid) TO sol_app;
  END IF;
END
$$;
