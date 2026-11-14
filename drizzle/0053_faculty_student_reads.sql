-- Faculty desk + workspace team + student enrollment reads (FORCE RLS).

CREATE OR REPLACE FUNCTION sol_section_learner_counts(p_section_ids uuid[])
RETURNS TABLE (section_id uuid, learner_count integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT s.id, COALESCE(COUNT(ss.id) FILTER (WHERE ss.status = 'ACTIVE'), 0)::int
  FROM unnest(p_section_ids) AS s(id)
  LEFT JOIN student_sections ss ON ss.section_id = s.id
  GROUP BY s.id;
$$;

CREATE OR REPLACE FUNCTION sol_quiz_ids_for_sections(p_section_ids uuid[])
RETURNS TABLE (quiz_id uuid, section_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT qs.quiz_id, qs.section_id
  FROM quiz_sections qs
  WHERE qs.section_id = ANY (p_section_ids);
$$;

CREATE OR REPLACE FUNCTION sol_quizzes_by_ids(p_quiz_ids uuid[])
RETURNS TABLE (
  id uuid,
  title text,
  is_active boolean,
  professor_id uuid,
  tenant_id uuid,
  offering_id uuid,
  end_date timestamptz,
  description text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT q.id, q.title, q.is_active, q.professor_id, q.tenant_id, q.offering_id,
         q.end_date, q.description
  FROM quizzes q
  WHERE q.id = ANY (p_quiz_ids) AND q.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION sol_recent_attempts_for_sections(
  p_section_ids uuid[],
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  quiz_id uuid,
  section_id uuid,
  submitted_at timestamptz,
  percentage integer,
  score integer,
  max_score integer,
  student_name text,
  student_email text,
  quiz_title text,
  section_name text,
  course_title text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    a.id, a.student_id, a.quiz_id, a.section_id, a.submitted_at,
    a.percentage, a.score, a.max_score,
    nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''),
    u.email, q.title, s.name, c.title
  FROM attempts a
  JOIN users u ON u.id = a.student_id
  JOIN quizzes q ON q.id = a.quiz_id
  JOIN sections s ON s.id = a.section_id
  JOIN courses c ON c.id = s.course_id
  WHERE a.section_id = ANY (p_section_ids)
    AND a.submitted_at IS NOT NULL
  ORDER BY a.submitted_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION sol_attempt_score_rows_for_sections(p_section_ids uuid[])
RETURNS TABLE (
  student_id uuid,
  quiz_id uuid,
  percentage integer,
  score integer,
  max_score integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT a.student_id, a.quiz_id, a.percentage, a.score, a.max_score
  FROM attempts a
  WHERE a.section_id = ANY (p_section_ids)
    AND a.submitted_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION sol_workspace_team_members(p_workspace_id uuid)
RETURNS TABLE (
  membership_id uuid,
  user_id uuid,
  role text,
  status text,
  created_at timestamptz,
  user_name text,
  user_email text,
  user_first_name text,
  user_last_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT m.id, m.user_id, m.role::text, m.status::text, m.created_at,
         nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''),
         u.email,
         u.first_name,
         u.last_name
  FROM workspace_memberships m
  JOIN users u ON u.id = m.user_id
  WHERE m.workspace_id = p_workspace_id AND m.status = 'active'
  ORDER BY m.created_at DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION sol_workspace_pending_invites(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  expires_at timestamptz,
  created_at timestamptz,
  claimed_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT i.id, i.email, i.role::text, i.expires_at, i.created_at, i.claimed_at
  FROM workspace_invites i
  WHERE i.workspace_id = p_workspace_id AND i.claimed_at IS NULL
  ORDER BY i.created_at DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION sol_user_enrollments_detail(p_user_id uuid)
RETURNS TABLE (
  enrollment_id uuid,
  section_id uuid,
  status text,
  enrolled_at timestamptz,
  section_name text,
  section_ends_at timestamptz,
  course_id uuid,
  course_title text,
  workspace_id uuid,
  workspace_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    ss.id, ss.section_id, ss.status::text, ss.enrolled_at,
    s.name, s.ends_at,
    c.id, c.title,
    c.workspace_id, w.name
  FROM student_sections ss
  JOIN sections s ON s.id = ss.section_id
  JOIN courses c ON c.id = s.course_id
  LEFT JOIN workspaces w ON w.id = c.workspace_id
  WHERE ss.student_id = p_user_id
    AND ss.status = 'ACTIVE'
    AND s.deleted_at IS NULL
    AND c.deleted_at IS NULL
  ORDER BY ss.enrolled_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_resolve_section_by_enrollment_code(p_code text)
RETURNS TABLE (
  section_id uuid,
  course_id uuid,
  workspace_id uuid,
  tenant_id uuid,
  name text,
  code_kind text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT s.id, s.course_id,
         COALESCE(s.workspace_id, c.workspace_id),
         COALESCE(s.tenant_id, c.tenant_id, c.workspace_id),
         s.name,
         CASE
           WHEN upper(s.student_enrollment_code) = upper(p_code) THEN 'student'
           WHEN upper(s.professor_enrollment_code) = upper(p_code) THEN 'professor'
           ELSE NULL
         END
  FROM sections s
  JOIN courses c ON c.id = s.course_id
  WHERE s.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND (
      upper(s.student_enrollment_code) = upper(p_code)
      OR upper(s.professor_enrollment_code) = upper(p_code)
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION sol_workspace_usage_daily(p_workspace_id uuid, p_limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  day text,
  grade_units integer,
  tutor_units integer,
  embed_units integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT u.id, u.day, u.grade_units, u.tutor_units, u.embed_units
  FROM workspace_usage_daily u
  WHERE u.workspace_id = p_workspace_id
  ORDER BY u.day DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION sol_workspace_audit_rows(p_workspace_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  action text,
  created_at timestamptz,
  actor_user_id uuid,
  metadata jsonb
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT a.id, a.action, a.created_at, a.actor_user_id, a.metadata
  FROM audit_log a
  WHERE a.tenant_id = p_workspace_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION sol_lti_platforms_for_workspace(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  issuer text,
  client_id text,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT p.id, p.issuer, p.client_id, p.created_at
  FROM lti_platforms p
  WHERE p.tenant_id = p_workspace_id
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_user_submitted_attempts(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  section_id uuid,
  submitted_at timestamptz,
  percentage integer,
  score integer,
  max_score integer,
  quiz_title text,
  section_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    a.id, a.quiz_id, a.section_id, a.submitted_at,
    a.percentage, a.score, a.max_score,
    q.title, s.name
  FROM attempts a
  JOIN quizzes q ON q.id = a.quiz_id
  JOIN sections s ON s.id = a.section_id
  WHERE a.student_id = p_user_id
    AND a.submitted_at IS NOT NULL
  ORDER BY a.submitted_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'sol_section_learner_counts(uuid[])',
    'sol_quiz_ids_for_sections(uuid[])',
    'sol_quizzes_by_ids(uuid[])',
    'sol_recent_attempts_for_sections(uuid[], integer)',
    'sol_attempt_score_rows_for_sections(uuid[])',
    'sol_workspace_team_members(uuid)',
    'sol_workspace_pending_invites(uuid)',
    'sol_user_enrollments_detail(uuid)',
    'sol_resolve_section_by_enrollment_code(text)',
    'sol_workspace_usage_daily(uuid, integer)',
    'sol_workspace_audit_rows(uuid, integer)',
    'sol_lti_platforms_for_workspace(uuid)',
    'sol_user_submitted_attempts(uuid, integer)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO sol_app', fn);
    END IF;
  END LOOP;
END
$$;
