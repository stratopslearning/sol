-- Entity resolve + teaching/support reads without app.tenant_id (FORCE RLS).

CREATE OR REPLACE FUNCTION sol_workspace_type(p_workspace_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT w.type::text FROM workspaces w WHERE w.id = p_workspace_id;
$$;

CREATE OR REPLACE FUNCTION sol_course_by_id(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  workspace_id uuid,
  tenant_id uuid,
  status text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT c.id, c.title, c.description, c.workspace_id, c.tenant_id, c.status::text
  FROM courses c
  WHERE c.id = p_course_id AND c.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION sol_section_by_id(p_section_id uuid)
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
  deleted_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    s.id, s.course_id, s.offering_id, s.workspace_id, s.tenant_id,
    s.name, s.professor_enrollment_code, s.student_enrollment_code,
    s.is_active, s.ends_at, s.deleted_at
  FROM sections s
  WHERE s.id = p_section_id;
$$;

CREATE OR REPLACE FUNCTION sol_offering_ids_for_course(p_course_id uuid)
RETURNS TABLE (id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.id FROM course_offerings o WHERE o.course_id = p_course_id;
$$;

CREATE OR REPLACE FUNCTION sol_section_rows_for_course(p_course_id uuid)
RETURNS TABLE (id uuid, offering_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT s.id, s.offering_id
  FROM sections s
  WHERE s.course_id = p_course_id AND s.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION sol_section_ids_for_offerings(p_offering_ids uuid[])
RETURNS TABLE (id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT s.id
  FROM sections s
  WHERE s.offering_id = ANY (p_offering_ids)
    AND s.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION sol_quiz_by_id(p_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  professor_id uuid,
  tenant_id uuid,
  offering_id uuid,
  end_date timestamptz,
  description text,
  deleted_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    q.id, q.title, q.professor_id, q.tenant_id, q.offering_id,
    q.end_date, q.description, q.deleted_at
  FROM quizzes q
  WHERE q.id = p_quiz_id AND q.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION sol_quiz_section_ids(p_quiz_id uuid)
RETURNS TABLE (section_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT qs.section_id FROM quiz_sections qs WHERE qs.quiz_id = p_quiz_id;
$$;

CREATE OR REPLACE FUNCTION sol_user_has_support_access(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM support_access_grants g
    WHERE g.user_id = p_user_id
      AND g.tenant_id = p_tenant_id
      AND g.expires_at > now()
  );
$$;

-- Expand bindings → section ids (org/dept/offering/section teaching roles).
CREATE OR REPLACE FUNCTION sol_user_teaching_section_ids(p_user_id uuid)
RETURNS TABLE (section_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH b AS (
    SELECT role::text AS role, scope_type::text AS scope_type, scope_id, tenant_id
    FROM role_bindings
    WHERE user_id = p_user_id AND revoked_at IS NULL
  ),
  from_section AS (
    SELECT b.scope_id AS section_id
    FROM b
    WHERE b.scope_type = 'section'
      AND b.role IN ('ta', 'grader', 'lead_instructor', 'co_instructor', 'faculty', 'owner', 'admin')
  ),
  from_offering AS (
    SELECT s.id AS section_id
    FROM b
    JOIN sections s ON s.offering_id = b.scope_id AND s.deleted_at IS NULL
    WHERE b.scope_type = 'offering'
      AND b.role IN ('lead_instructor', 'co_instructor', 'faculty', 'owner', 'admin')
  ),
  from_org AS (
    SELECT s.id AS section_id
    FROM b
    JOIN courses c ON c.workspace_id = b.tenant_id AND c.deleted_at IS NULL
    JOIN sections s ON s.course_id = c.id AND s.deleted_at IS NULL
    WHERE b.scope_type IN ('organization', 'department')
      AND b.role IN (
        'owner', 'admin', 'faculty', 'lead_instructor', 'co_instructor', 'ta', 'grader'
      )
  )
  SELECT DISTINCT section_id FROM (
    SELECT section_id FROM from_section
    UNION ALL
    SELECT section_id FROM from_offering
    UNION ALL
    SELECT section_id FROM from_org
  ) x
  WHERE section_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION sol_sections_by_ids(p_ids uuid[])
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
  course_title text,
  course_workspace_id uuid
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    s.id, s.course_id, s.offering_id, s.workspace_id, s.tenant_id,
    s.name, s.professor_enrollment_code, s.student_enrollment_code,
    s.is_active, s.ends_at,
    c.title AS course_title,
    c.workspace_id AS course_workspace_id
  FROM sections s
  JOIN courses c ON c.id = s.course_id
  WHERE s.id = ANY (p_ids)
    AND s.deleted_at IS NULL
    AND c.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION sol_workspace_type(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_course_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_section_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_offering_ids_for_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_section_rows_for_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_section_ids_for_offerings(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_quiz_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_quiz_section_ids(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_user_has_support_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_user_teaching_section_ids(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_sections_by_ids(uuid[]) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_workspace_type(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_course_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_section_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_offering_ids_for_course(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_section_rows_for_course(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_section_ids_for_offerings(uuid[]) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_quiz_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_quiz_section_ids(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_user_has_support_access(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_user_teaching_section_ids(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_sections_by_ids(uuid[]) TO sol_app;
  END IF;
END
$$;
