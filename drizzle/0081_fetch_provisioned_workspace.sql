-- Read workspace + license after DEFINER bootstrap without relying on
-- transaction-local app.tenant_id GUCs (Neon pool / WS can drop is_local).

CREATE OR REPLACE FUNCTION sol_fetch_provisioned_workspace(p_id uuid)
RETURNS TABLE (
  workspace jsonb,
  license jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    to_jsonb(w.*) AS workspace,
    to_jsonb(l.*) AS license
  FROM workspaces w
  LEFT JOIN LATERAL (
    SELECT *
    FROM workspace_licenses wl
    WHERE wl.workspace_id = w.id
    ORDER BY
      CASE WHEN wl.status IN ('active', 'trialing') THEN 0 ELSE 1 END,
      wl.created_at DESC NULLS LAST
    LIMIT 1
  ) l ON true
  WHERE w.id = p_id;
$$;

REVOKE ALL ON FUNCTION sol_fetch_provisioned_workspace(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_fetch_provisioned_workspace(uuid) TO sol_app;
  END IF;
END
$$;
