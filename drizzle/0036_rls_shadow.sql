-- Phase D1: RLS shadow (not FORCE). app.tenant_id GUC matches workspace_id today.

-- courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courses_tenant_isolation ON courses;
CREATE POLICY courses_tenant_isolation ON courses
  FOR ALL
  USING (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  )
  WITH CHECK (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  );

-- sections (denormalized workspace_id)
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sections_tenant_isolation ON sections;
CREATE POLICY sections_tenant_isolation ON sections
  FOR ALL
  USING (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  )
  WITH CHECK (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  );

-- shared knowledge library
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_documents_tenant_isolation ON knowledge_documents;
CREATE POLICY knowledge_documents_tenant_isolation ON knowledge_documents
  FOR ALL
  USING (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  )
  WITH CHECK (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  );

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_chunks_tenant_isolation ON knowledge_chunks;
CREATE POLICY knowledge_chunks_tenant_isolation ON knowledge_chunks
  FOR ALL
  USING (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  )
  WITH CHECK (
    workspace_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  );

-- attempts + quizzes (tenant_id from 0033)
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attempts_tenant_isolation ON attempts;
CREATE POLICY attempts_tenant_isolation ON attempts
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  );

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quizzes_tenant_isolation ON quizzes;
CREATE POLICY quizzes_tenant_isolation ON quizzes
  FOR ALL
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.tenant_id', true) = ''
  );
