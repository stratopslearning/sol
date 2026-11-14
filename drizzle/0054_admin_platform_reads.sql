-- Platform ops cross-tenant reads under FORCE RLS (sol_app has no app.tenant_id).
-- Authority still gated in TS via requireAdmin() / platform_staff.

CREATE OR REPLACE FUNCTION sol_admin_overview_stats()
RETURNS TABLE (
  workspace_count integer,
  pending_invite_count integer,
  unpaid_license_count integer,
  course_count integer,
  ongoing_section_count integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    (SELECT count(*)::int FROM workspaces) AS workspace_count,
    (SELECT count(*)::int FROM workspace_invites WHERE claimed_at IS NULL) AS pending_invite_count,
    (
      SELECT count(*)::int
      FROM workspace_licenses
      WHERE billing_provider = 'stripe'
        AND (status = 'trialing' OR stripe_subscription_id IS NULL)
    ) AS unpaid_license_count,
    (SELECT count(*)::int FROM courses WHERE deleted_at IS NULL) AS course_count,
    (
      SELECT count(*)::int
      FROM sections
      WHERE deleted_at IS NULL
        AND is_active = true
        AND (ends_at IS NULL OR ends_at > now())
    ) AS ongoing_section_count;
$$;

CREATE OR REPLACE FUNCTION sol_admin_workspace_directory()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  type text,
  status text,
  parent_workspace_id uuid,
  created_at timestamptz,
  seat_cap integer,
  license_plan text,
  license_status text,
  billing_provider text,
  license_period_end timestamptz,
  owner_email text,
  claim_status text,
  course_count integer,
  open_invite_count integer,
  child_count integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH license AS (
    SELECT DISTINCT ON (workspace_id)
      workspace_id, plan, status, billing_provider, seat_cap, period_end
    FROM workspace_licenses
    ORDER BY workspace_id, created_at DESC
  ),
  owner_member AS (
    SELECT DISTINCT ON (m.workspace_id)
      m.workspace_id, u.email
    FROM workspace_memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.role = 'owner' AND m.status = 'active'
    ORDER BY m.workspace_id, m.created_at ASC
  ),
  latest_invite AS (
    SELECT DISTINCT ON (workspace_id)
      workspace_id, email, claimed_at, expires_at, created_at
    FROM workspace_invites
    ORDER BY workspace_id, created_at DESC
  ),
  course_counts AS (
    SELECT workspace_id, count(*)::int AS n
    FROM courses
    WHERE deleted_at IS NULL
    GROUP BY workspace_id
  ),
  open_invites AS (
    SELECT workspace_id, count(*)::int AS n
    FROM workspace_invites
    WHERE claimed_at IS NULL AND expires_at > now()
    GROUP BY workspace_id
  ),
  children AS (
    SELECT parent_workspace_id AS workspace_id, count(*)::int AS n
    FROM workspaces
    WHERE parent_workspace_id IS NOT NULL
    GROUP BY parent_workspace_id
  )
  SELECT
    w.id,
    w.slug,
    w.name,
    w.type::text,
    w.status::text,
    w.parent_workspace_id,
    w.created_at,
    lic.seat_cap,
    lic.plan::text AS license_plan,
    lic.status::text AS license_status,
    lic.billing_provider::text,
    lic.period_end AS license_period_end,
    COALESCE(om.email, li.email) AS owner_email,
    CASE
      WHEN li.claimed_at IS NOT NULL OR om.email IS NOT NULL THEN 'claimed'
      WHEN li.workspace_id IS NULL THEN 'none'
      WHEN li.expires_at < now() THEN 'expired'
      ELSE 'pending'
    END AS claim_status,
    COALESCE(cc.n, 0) AS course_count,
    COALESCE(oi.n, 0) AS open_invite_count,
    COALESCE(ch.n, 0) AS child_count
  FROM workspaces w
  LEFT JOIN license lic ON lic.workspace_id = w.id
  LEFT JOIN owner_member om ON om.workspace_id = w.id
  LEFT JOIN latest_invite li ON li.workspace_id = w.id
  LEFT JOIN course_counts cc ON cc.workspace_id = w.id
  LEFT JOIN open_invites oi ON oi.workspace_id = w.id
  LEFT JOIN children ch ON ch.workspace_id = w.id
  ORDER BY w.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_admin_courses_all()
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  tenant_id uuid,
  title text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  section_count integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    c.id,
    c.workspace_id,
    c.tenant_id,
    c.title,
    c.description,
    c.status::text,
    c.created_at,
    c.updated_at,
    (
      SELECT count(*)::int
      FROM sections s
      WHERE s.course_id = c.id AND s.deleted_at IS NULL
    ) AS section_count
  FROM courses c
  WHERE c.deleted_at IS NULL
  ORDER BY c.created_at DESC;
$$;

DROP FUNCTION IF EXISTS sol_admin_sections_all();

CREATE OR REPLACE FUNCTION sol_admin_sections_all()
RETURNS TABLE (
  id uuid,
  course_id uuid,
  offering_id uuid,
  workspace_id uuid,
  tenant_id uuid,
  name text,
  professor_enrollment_code text,
  student_enrollment_code text,
  is_active boolean,
  ends_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz,
  course_title text,
  workspace_name text,
  learner_count integer,
  faculty_count integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    s.id,
    s.course_id,
    s.offering_id,
    s.workspace_id,
    s.tenant_id,
    s.name,
    s.professor_enrollment_code,
    s.student_enrollment_code,
    s.is_active,
    s.ends_at,
    s.deleted_at,
    s.created_at,
    c.title AS course_title,
    w.name AS workspace_name,
    (
      SELECT count(*)::int FROM student_sections ss
      WHERE ss.section_id = s.id AND ss.status = 'ACTIVE'
    ) AS learner_count,
    (
      SELECT count(*)::int FROM professor_sections ps
      WHERE ps.section_id = s.id AND ps.status = 'ACTIVE'
    ) AS faculty_count
  FROM sections s
  JOIN courses c ON c.id = s.course_id
  LEFT JOIN workspaces w ON w.id = COALESCE(s.workspace_id, c.workspace_id)
  WHERE s.deleted_at IS NULL
  ORDER BY s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION sol_admin_overview_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_workspace_directory() FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_courses_all() FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_admin_sections_all() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_admin_overview_stats() TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_workspace_directory() TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_courses_all() TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_admin_sections_all() TO sol_app;
  END IF;
END
$$;
