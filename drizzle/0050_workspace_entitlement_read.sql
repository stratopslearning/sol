-- Workspace + license snapshot for course-create entitlement without app.tenant_id.

CREATE OR REPLACE FUNCTION sol_workspace_course_entitlement(p_workspace_id uuid)
RETURNS TABLE (
  workspace_exists boolean,
  workspace_type text,
  license_status text,
  billing_provider text,
  stripe_subscription_id text,
  period_end timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (w.id IS NOT NULL) AS workspace_exists,
    w.type::text AS workspace_type,
    lic.status::text AS license_status,
    lic.billing_provider::text AS billing_provider,
    lic.stripe_subscription_id,
    lic.period_end
  FROM (SELECT p_workspace_id AS id) AS q
  LEFT JOIN workspaces w ON w.id = q.id
  LEFT JOIN LATERAL (
    SELECT l.status, l.billing_provider, l.stripe_subscription_id, l.period_end
    FROM workspace_licenses l
    WHERE l.workspace_id = q.id
      AND l.status IN ('active', 'trialing')
    ORDER BY l.created_at DESC NULLS LAST
    LIMIT 1
  ) lic ON true;
$$;

REVOKE ALL ON FUNCTION sol_workspace_course_entitlement(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_workspace_course_entitlement(uuid) TO sol_app;
  END IF;
END
$$;
