-- Active workspace license under FORCE RLS (student enroll seat check).
-- Bare drizzle on workspace_licenses returns 0 rows without app.tenant_id,
-- falsely blocking join with "No active license for this workspace."

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_active_workspace_license(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row workspace_licenses%ROWTYPE;
BEGIN
  IF p_workspace_id IS NULL THEN RETURN NULL; END IF;
  PERFORM set_config('app.tenant_id', p_workspace_id::text, true);

  SELECT * INTO v_row
  FROM workspace_licenses
  WHERE workspace_id = p_workspace_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_active_workspace_license(uuid) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_active_workspace_license(uuid) TO sol_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner')
     AND pg_has_role(current_user, 'neondb_owner', 'member') THEN
    ALTER FUNCTION sol_active_workspace_license(uuid) OWNER TO neondb_owner;
  END IF;
END
$$;
