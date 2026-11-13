-- Platform audit inserts use INSERT … RETURNING. Under FORCE RLS, RETURNING
-- also checks SELECT policies. The old SELECT policy only allowed tenant rows,
-- so null-tenant platform events failed even when INSERT WITH CHECK passed.

CREATE OR REPLACE FUNCTION sol_audit_platform_guc()
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(nullif(current_setting('app.audit_platform', true), ''), '0') = '1'
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_migrator') THEN
    ALTER FUNCTION sol_audit_platform_guc() OWNER TO sol_migrator;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_audit_platform_guc() TO sol_app;
  END IF;
END
$$;

DROP POLICY IF EXISTS audit_log_tenant_insert ON audit_log;
CREATE POLICY audit_log_tenant_insert ON audit_log
  FOR INSERT
  WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id::text = sol_tenant_guc())
    OR (tenant_id IS NULL AND sol_audit_platform_guc())
  );

DROP POLICY IF EXISTS audit_log_tenant_select ON audit_log;
CREATE POLICY audit_log_tenant_select ON audit_log
  FOR SELECT
  USING (
    (tenant_id IS NOT NULL AND tenant_id::text = sol_tenant_guc())
    OR (tenant_id IS NULL AND sol_audit_platform_guc())
  );
