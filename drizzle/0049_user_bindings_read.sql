-- Allow sol_app to read a user's own role_bindings / enrollments without
-- app.tenant_id (FORCE RLS otherwise hides them and onboarding/gates break).

CREATE OR REPLACE FUNCTION sol_user_role_bindings(
  p_user_id uuid,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  tenant_id uuid,
  role text,
  scope_type text,
  scope_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.tenant_id, b.role::text, b.scope_type::text, b.scope_id
  FROM role_bindings b
  WHERE b.user_id = p_user_id
    AND b.revoked_at IS NULL
    AND (p_tenant_id IS NULL OR b.tenant_id = p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION sol_user_has_active_enrollment(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM student_sections ss
    WHERE ss.student_id = p_user_id
      AND ss.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION sol_user_enrolled_in_section(
  p_user_id uuid,
  p_section_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM student_sections ss
    WHERE ss.student_id = p_user_id
      AND ss.section_id = p_section_id
      AND ss.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION sol_user_active_memberships(p_user_id uuid)
RETURNS TABLE (
  membership_id uuid,
  workspace_id uuid,
  status text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.id, m.workspace_id, m.status::text, m.created_at
  FROM workspace_memberships m
  WHERE m.user_id = p_user_id
    AND m.status = 'active';
$$;

-- Full hydrate for switcher / home (avoids withTenant under flaky Neon pool GUCs).
CREATE OR REPLACE FUNCTION sol_user_active_memberships_detail(p_user_id uuid)
RETURNS TABLE (
  membership_id uuid,
  membership_role text,
  membership_status text,
  membership_created_at timestamptz,
  membership_updated_at timestamptz,
  workspace_id uuid,
  workspace_slug text,
  workspace_name text,
  workspace_type text,
  workspace_status text,
  workspace_parent_id uuid,
  workspace_settings jsonb,
  workspace_created_at timestamptz,
  workspace_updated_at timestamptz,
  license_id uuid,
  license_plan text,
  license_seat_cap integer,
  license_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    m.id,
    m.role::text,
    m.status::text,
    m.created_at,
    m.updated_at,
    w.id,
    w.slug,
    w.name,
    w.type::text,
    w.status::text,
    w.parent_workspace_id,
    w.settings,
    w.created_at,
    w.updated_at,
    lic.id,
    lic.plan::text,
    lic.seat_cap,
    lic.status::text
  FROM workspace_memberships m
  JOIN workspaces w ON w.id = m.workspace_id
  LEFT JOIN LATERAL (
    SELECT l.id, l.plan, l.seat_cap, l.status
    FROM workspace_licenses l
    WHERE l.workspace_id = w.id
    ORDER BY l.created_at DESC NULLS LAST
    LIMIT 1
  ) lic ON true
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
  ORDER BY m.created_at DESC;
$$;

REVOKE ALL ON FUNCTION sol_user_role_bindings(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_user_has_active_enrollment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_user_enrolled_in_section(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_user_active_memberships(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_user_active_memberships_detail(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_user_role_bindings(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_user_has_active_enrollment(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_user_enrolled_in_section(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_user_active_memberships(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_user_active_memberships_detail(uuid) TO sol_app;
  END IF;
END
$$;
