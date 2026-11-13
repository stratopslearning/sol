-- Course knowledge attachments + workspace library under FORCE RLS.

CREATE OR REPLACE FUNCTION sol_course_linked_documents(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  title text,
  source_kind text,
  mime_type text,
  byte_size integer,
  status text,
  error_message text,
  external_url text,
  connector_id uuid,
  current_version_id uuid,
  visibility text,
  created_by_user_id uuid,
  authoring_corpus text,
  pinned_version_id uuid,
  update_available_version_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    kd.id,
    kd.workspace_id,
    kd.title,
    kd.source_kind::text,
    kd.mime_type,
    kd.byte_size,
    kd.status::text,
    kd.error_message,
    kd.external_url,
    kd.connector_id,
    kd.current_version_id,
    kd.visibility::text,
    kd.created_by_user_id,
    ckl.authoring_corpus::text,
    ckl.pinned_version_id,
    ckl.update_available_version_id,
    kd.created_at,
    kd.updated_at
  FROM course_knowledge_links ckl
  JOIN knowledge_documents kd ON kd.id = ckl.document_id
  WHERE ckl.course_id = p_course_id
    AND kd.deleted_at IS NULL
  ORDER BY kd.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_workspace_documents(
  p_workspace_id uuid,
  p_user_id uuid,
  p_coordinator boolean
)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  title text,
  source_kind text,
  mime_type text,
  byte_size integer,
  status text,
  error_message text,
  external_url text,
  connector_id uuid,
  current_version_id uuid,
  visibility text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    kd.id,
    kd.workspace_id,
    kd.title,
    kd.source_kind::text,
    kd.mime_type,
    kd.byte_size,
    kd.status::text,
    kd.error_message,
    kd.external_url,
    kd.connector_id,
    kd.current_version_id,
    kd.visibility::text,
    kd.created_by_user_id,
    kd.created_at,
    kd.updated_at
  FROM knowledge_documents kd
  WHERE kd.workspace_id = p_workspace_id
    AND kd.deleted_at IS NULL
    AND (
      p_coordinator
      OR kd.visibility = 'workspace'
      OR (
        kd.visibility = 'personal'
        AND kd.created_by_user_id = p_user_id
      )
    )
  ORDER BY kd.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION sol_course_authoring_material_stats(p_course_id uuid)
RETURNS TABLE (
  ready_count integer,
  prior_tagged_count integer,
  this_term_tagged_count integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH ready_materials AS (
    SELECT m.authoring_corpus
    FROM course_materials m
    WHERE m.course_id = p_course_id
      AND m.deleted_at IS NULL
      AND m.status = 'READY'
  ),
  links AS (
    SELECT ckl.authoring_corpus
    FROM course_knowledge_links ckl
    WHERE ckl.course_id = p_course_id
  )
  SELECT
    (SELECT count(*)::int FROM ready_materials) AS ready_count,
    (
      (SELECT count(*)::int FROM ready_materials WHERE authoring_corpus = 'prior_course')
      + (SELECT count(*)::int FROM links WHERE authoring_corpus = 'prior_course')
    ) AS prior_tagged_count,
    (
      (SELECT count(*)::int FROM ready_materials WHERE authoring_corpus IS DISTINCT FROM 'prior_course')
      + (SELECT count(*)::int FROM links WHERE authoring_corpus IS DISTINCT FROM 'prior_course')
    ) AS this_term_tagged_count;
$$;

REVOKE ALL ON FUNCTION sol_course_linked_documents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_workspace_documents(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_course_authoring_material_stats(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_course_linked_documents(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_workspace_documents(uuid, uuid, boolean) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_course_authoring_material_stats(uuid) TO sol_app;
  END IF;
END
$$;
