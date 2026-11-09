-- Admin workspace delete under FORCE RLS. Bare db.query.workspaces.findFirst
-- returns null for platform staff without membership → false "Workspace not found".

CREATE OR REPLACE FUNCTION sol_admin_workspace_delete_info(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_ws workspaces%ROWTYPE;
  v_children integer;
  v_courses integer;
BEGIN
  SELECT * INTO v_ws FROM workspaces WHERE id = p_workspace_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::integer INTO v_children
  FROM workspaces
  WHERE parent_workspace_id = p_workspace_id;

  SELECT count(*)::integer INTO v_courses
  FROM courses
  WHERE workspace_id = p_workspace_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'id', v_ws.id,
    'slug', v_ws.slug,
    'name', v_ws.name,
    'type', v_ws.type,
    'status', v_ws.status,
    'parentWorkspaceId', v_ws.parent_workspace_id,
    'childCount', v_children,
    'activeCourseCount', v_courses
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_soft_delete_workspace(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_course_count integer;
BEGIN
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);

  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  UPDATE sections s
  SET deleted_at = v_now, is_active = false
  FROM courses c
  WHERE s.course_id = c.id
    AND c.workspace_id = p_workspace_id
    AND s.deleted_at IS NULL;

  UPDATE courses
  SET deleted_at = v_now, is_active = false
  WHERE workspace_id = p_workspace_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_course_count = ROW_COUNT;

  UPDATE workspace_licenses
  SET status = 'canceled', updated_at = v_now
  WHERE workspace_id = p_workspace_id;

  UPDATE workspaces
  SET status = 'churned', updated_at = v_now
  WHERE id = p_workspace_id;

  RETURN jsonb_build_object(
    'mode', 'soft',
    'workspaceId', p_workspace_id,
    'courseCount', v_course_count
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_admin_hard_delete_workspace(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);

  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM workspaces WHERE parent_workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'WORKSPACE_HAS_CHILDREN';
  END IF;

  IF EXISTS (
    SELECT 1 FROM courses
    WHERE workspace_id = p_workspace_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'WORKSPACE_HAS_ACTIVE_COURSES';
  END IF;

  DELETE FROM workspaces WHERE id = p_workspace_id;

  RETURN jsonb_build_object(
    'mode', 'hard',
    'workspaceId', p_workspace_id,
    'deletedId', p_workspace_id
  );
END;
$$;

REVOKE ALL ON FUNCTION sol_admin_workspace_delete_info(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_soft_delete_workspace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_hard_delete_workspace(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_admin_workspace_delete_info(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_soft_delete_workspace(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_hard_delete_workspace(uuid) TO sol_app;
  END IF;
END
$$;
