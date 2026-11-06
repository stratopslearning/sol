-- Knowledge document + version reads under FORCE RLS (no app.tenant_id).
-- Library list already uses sol_workspace_documents; Versions/mutations need
-- the same DEFINER path for single-document resolve.

CREATE OR REPLACE FUNCTION sol_knowledge_document_by_id(p_document_id uuid)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  title text,
  visibility text,
  created_by_user_id uuid,
  deleted_at timestamptz,
  current_version_id uuid,
  status text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    kd.id,
    kd.workspace_id,
    kd.title,
    kd.visibility::text,
    kd.created_by_user_id,
    kd.deleted_at,
    kd.current_version_id,
    kd.status::text
  FROM knowledge_documents kd
  WHERE kd.id = p_document_id;
$$;

CREATE OR REPLACE FUNCTION sol_knowledge_document_versions(p_document_id uuid)
RETURNS TABLE (
  id uuid,
  version integer,
  ocr_used boolean,
  char_count integer,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    kdv.id,
    kdv.version,
    kdv.ocr_used,
    kdv.char_count,
    kdv.created_at
  FROM knowledge_document_versions kdv
  WHERE kdv.document_id = p_document_id
  ORDER BY kdv.version DESC;
$$;

REVOKE ALL ON FUNCTION sol_knowledge_document_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_knowledge_document_versions(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_knowledge_document_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_knowledge_document_versions(uuid) TO sol_app;
  END IF;
END
$$;
