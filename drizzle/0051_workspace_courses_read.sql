-- Tenant-scoped course/section reads without app.tenant_id (FORCE RLS).

CREATE OR REPLACE FUNCTION sol_workspace_courses(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  tenant_id uuid,
  title text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.workspace_id,
    c.tenant_id,
    c.title,
    c.description,
    c.status::text,
    c.created_at,
    c.updated_at
  FROM courses c
  WHERE c.workspace_id = p_workspace_id
    AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_workspace_sections(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  name text,
  professor_enrollment_code text,
  student_enrollment_code text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    s.id,
    s.course_id,
    s.name,
    s.professor_enrollment_code,
    s.student_enrollment_code,
    s.is_active,
    s.created_at
  FROM sections s
  JOIN courses c ON c.id = s.course_id
  WHERE c.workspace_id = p_workspace_id
    AND c.deleted_at IS NULL
    AND s.deleted_at IS NULL
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_workspace_active_learner_count(p_workspace_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT count(DISTINCT ss.student_id)::int
      FROM student_sections ss
      JOIN sections s ON s.id = ss.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE c.workspace_id = p_workspace_id
        AND ss.status = 'ACTIVE'
        AND s.is_active = true
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
    ),
    0
  );
$$;

CREATE OR REPLACE FUNCTION sol_courses_for_tenants(p_tenant_ids uuid[])
RETURNS TABLE (
  id uuid,
  workspace_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.id, c.workspace_id
  FROM courses c
  WHERE c.deleted_at IS NULL
    AND c.workspace_id = ANY (p_tenant_ids);
$$;

CREATE OR REPLACE FUNCTION sol_offering_course_id(p_offering_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT o.course_id FROM course_offerings o WHERE o.id = p_offering_id;
$$;

CREATE OR REPLACE FUNCTION sol_section_course_id(p_section_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.course_id FROM sections s WHERE s.id = p_section_id;
$$;

CREATE OR REPLACE FUNCTION sol_courses_by_ids(p_ids uuid[])
RETURNS TABLE (
  id uuid,
  title text,
  section_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.title,
    (
      SELECT count(*)::int
      FROM sections s
      WHERE s.course_id = c.id
        AND s.deleted_at IS NULL
    ) AS section_count
  FROM courses c
  WHERE c.id = ANY (p_ids)
    AND c.deleted_at IS NULL
  ORDER BY c.title;
$$;

REVOKE ALL ON FUNCTION sol_workspace_courses(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_workspace_sections(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_workspace_active_learner_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_courses_for_tenants(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_offering_course_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_section_course_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_courses_by_ids(uuid[]) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_workspace_courses(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_workspace_sections(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_workspace_active_learner_count(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_courses_for_tenants(uuid[]) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_offering_course_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_section_course_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_courses_by_ids(uuid[]) TO sol_app;
  END IF;
END
$$;
