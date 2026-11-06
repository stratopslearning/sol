-- Platform ops audit log: FORCE RLS hides all rows from sol_app unless a
-- tenant GUC matches (or audit_platform GUC for null-tenant rows only).
-- Admin overview needs a DEFINER that can list the full trail.

CREATE OR REPLACE FUNCTION sol_platform_audit_rows(
  p_action text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  action text,
  created_at timestamptz,
  actor_user_id uuid,
  actor_clerk_id text,
  target_type text,
  target_id text,
  tenant_id uuid,
  metadata jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    a.action,
    a.created_at,
    a.actor_user_id,
    a.actor_clerk_id,
    a.target_type,
    a.target_id,
    a.tenant_id,
    a.metadata
  FROM audit_log a
  WHERE (p_action IS NULL OR a.action = p_action)
    AND (p_tenant_id IS NULL OR a.tenant_id = p_tenant_id)
    AND (p_from IS NULL OR a.created_at >= p_from)
    AND (p_to IS NULL OR a.created_at <= p_to)
  ORDER BY a.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION sol_platform_audit_count(
  p_action text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT count(*)::int
  FROM audit_log a
  WHERE (p_action IS NULL OR a.action = p_action)
    AND (p_tenant_id IS NULL OR a.tenant_id = p_tenant_id)
    AND (p_from IS NULL OR a.created_at >= p_from)
    AND (p_to IS NULL OR a.created_at <= p_to);
$$;

-- Keep ownership on a BYPASSRLS role (neondb_owner / table owner). FORCE RLS
-- still applies to sol_migrator, so DEFINER-as-migrator would return 0 rows.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'sol_platform_audit_rows(text, uuid, timestamptz, timestamptz, integer, integer)',
    'sol_platform_audit_count(text, uuid, timestamptz, timestamptz)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO sol_app', fn);
    END IF;
  END LOOP;
END
$$;
