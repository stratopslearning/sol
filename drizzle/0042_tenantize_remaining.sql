-- 0042: tenant_root + tenantize remaining education tables + FORCE RLS
-- + SECURITY DEFINER resolve_api_token / append_audit / resolve_lti_platform.
-- Expand → backfill (via tenant_root) → NOT NULL → index → policy.
-- Apply: I_CONFIRM_DEV_DB=1 npx tsx scripts/apply-0042-tenantize-remaining.ts

-- ---------------------------------------------------------------------------
-- tenant_root(workspace_id): walk parent_workspace_id until null
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tenant_root(p_workspace_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cur uuid := p_workspace_id;
  parent uuid;
  guard int := 0;
BEGIN
  IF cur IS NULL THEN
    RETURN NULL;
  END IF;
  LOOP
    SELECT w.parent_workspace_id INTO parent
    FROM workspaces w
    WHERE w.id = cur;
    IF parent IS NULL THEN
      RETURN cur;
    END IF;
    cur := parent;
    guard := guard + 1;
    IF guard > 64 THEN
      RAISE EXCEPTION 'tenant_root: parent cycle or depth > 64 for %', p_workspace_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION tenant_root(uuid) TO sol_app;
GRANT EXECUTE ON FUNCTION tenant_root(uuid) TO PUBLIC;

-- ---------------------------------------------------------------------------
-- grade_overrides
-- ---------------------------------------------------------------------------
ALTER TABLE grade_overrides ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE grade_overrides go
SET tenant_id = tenant_root(a.tenant_id)
FROM attempts a
WHERE go.attempt_id = a.id AND go.tenant_id IS NULL AND a.tenant_id IS NOT NULL;
DELETE FROM grade_overrides WHERE tenant_id IS NULL;
ALTER TABLE grade_overrides ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE grade_overrides
    ADD CONSTRAINT grade_overrides_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS grade_overrides_tenant_idx ON grade_overrides (tenant_id);

ALTER TABLE grade_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_overrides FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grade_overrides_tenant_isolation ON grade_overrides;
CREATE POLICY grade_overrides_tenant_isolation ON grade_overrides
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- regrade_requests
-- ---------------------------------------------------------------------------
ALTER TABLE regrade_requests ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE regrade_requests rr
SET tenant_id = tenant_root(a.tenant_id)
FROM attempts a
WHERE rr.attempt_id = a.id AND rr.tenant_id IS NULL AND a.tenant_id IS NOT NULL;
DELETE FROM regrade_requests WHERE tenant_id IS NULL;
ALTER TABLE regrade_requests ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE regrade_requests
    ADD CONSTRAINT regrade_requests_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS regrade_requests_tenant_idx ON regrade_requests (tenant_id);

ALTER TABLE regrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE regrade_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS regrade_requests_tenant_isolation ON regrade_requests;
CREATE POLICY regrade_requests_tenant_isolation ON regrade_requests
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- quiz_versions
-- ---------------------------------------------------------------------------
ALTER TABLE quiz_versions ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE quiz_versions qv
SET tenant_id = tenant_root(q.tenant_id)
FROM quizzes q
WHERE qv.quiz_id = q.id AND qv.tenant_id IS NULL AND q.tenant_id IS NOT NULL;
DELETE FROM quiz_versions WHERE tenant_id IS NULL;
ALTER TABLE quiz_versions ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE quiz_versions
    ADD CONSTRAINT quiz_versions_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS quiz_versions_tenant_idx ON quiz_versions (tenant_id);

ALTER TABLE quiz_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_versions_tenant_isolation ON quiz_versions;
CREATE POLICY quiz_versions_tenant_isolation ON quiz_versions
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- knowledge_connectors
-- ---------------------------------------------------------------------------
ALTER TABLE knowledge_connectors ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE knowledge_connectors
SET tenant_id = tenant_root(workspace_id)
WHERE tenant_id IS NULL;
DELETE FROM knowledge_connectors WHERE tenant_id IS NULL;
ALTER TABLE knowledge_connectors ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE knowledge_connectors
    ADD CONSTRAINT knowledge_connectors_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS knowledge_connectors_tenant_idx ON knowledge_connectors (tenant_id);

ALTER TABLE knowledge_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_connectors FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_connectors_tenant_isolation ON knowledge_connectors;
CREATE POLICY knowledge_connectors_tenant_isolation ON knowledge_connectors
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- knowledge_document_versions
-- ---------------------------------------------------------------------------
ALTER TABLE knowledge_document_versions ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE knowledge_document_versions kdv
SET tenant_id = tenant_root(kd.tenant_id)
FROM knowledge_documents kd
WHERE kdv.document_id = kd.id AND kdv.tenant_id IS NULL AND kd.tenant_id IS NOT NULL;
DELETE FROM knowledge_document_versions WHERE tenant_id IS NULL;
ALTER TABLE knowledge_document_versions ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE knowledge_document_versions
    ADD CONSTRAINT knowledge_document_versions_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS knowledge_document_versions_tenant_idx ON knowledge_document_versions (tenant_id);

ALTER TABLE knowledge_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_document_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_document_versions_tenant_isolation ON knowledge_document_versions;
CREATE POLICY knowledge_document_versions_tenant_isolation ON knowledge_document_versions
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- knowledge_sync_runs
-- ---------------------------------------------------------------------------
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE knowledge_sync_runs
SET tenant_id = tenant_root(workspace_id)
WHERE tenant_id IS NULL;
DELETE FROM knowledge_sync_runs WHERE tenant_id IS NULL;
ALTER TABLE knowledge_sync_runs ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE knowledge_sync_runs
    ADD CONSTRAINT knowledge_sync_runs_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS knowledge_sync_runs_tenant_idx ON knowledge_sync_runs (tenant_id);

ALTER TABLE knowledge_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sync_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_sync_runs_tenant_isolation ON knowledge_sync_runs;
CREATE POLICY knowledge_sync_runs_tenant_isolation ON knowledge_sync_runs
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- authoring_policies: add tenant_id (keep workspace_id unique)
-- ---------------------------------------------------------------------------
ALTER TABLE authoring_policies ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE authoring_policies
SET tenant_id = tenant_root(workspace_id)
WHERE tenant_id IS NULL;
DELETE FROM authoring_policies WHERE tenant_id IS NULL;
ALTER TABLE authoring_policies ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE authoring_policies
    ADD CONSTRAINT authoring_policies_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS authoring_policies_tenant_idx ON authoring_policies (tenant_id);

ALTER TABLE authoring_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE authoring_policies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authoring_policies_tenant_isolation ON authoring_policies;
CREATE POLICY authoring_policies_tenant_isolation ON authoring_policies
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- professor_api_tokens: tenant_id NOT NULL; single-tenant backfill else revoke
-- ---------------------------------------------------------------------------
ALTER TABLE professor_api_tokens ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Distinct tenants per user from memberships + role_bindings (roots only).
WITH user_tenants AS (
  SELECT user_id, tenant_id FROM (
    SELECT wm.user_id AS user_id, tenant_root(wm.workspace_id) AS tenant_id
    FROM workspace_memberships wm
    WHERE wm.status = 'active'
    UNION
    SELECT rb.user_id, tenant_root(rb.tenant_id)
    FROM role_bindings rb
    WHERE rb.revoked_at IS NULL
  ) s
  WHERE tenant_id IS NOT NULL
  GROUP BY user_id, tenant_id
),
sole AS (
  SELECT user_id, MIN(tenant_id::text)::uuid AS tenant_id
  FROM user_tenants
  GROUP BY user_id
  HAVING COUNT(*) = 1
)
UPDATE professor_api_tokens pat
SET tenant_id = sole.tenant_id
FROM sole
WHERE pat.user_id = sole.user_id
  AND pat.tenant_id IS NULL
  AND pat.revoked_at IS NULL;

-- Revoke tokens that still lack tenant_id (multi-tenant or no tenant).
UPDATE professor_api_tokens
SET revoked_at = COALESCE(revoked_at, now())
WHERE tenant_id IS NULL;

-- Rows that remain NULL (already revoked): attach a placeholder is not allowed.
-- Delete revoked rows without tenant so NOT NULL can apply.
DELETE FROM professor_api_tokens WHERE tenant_id IS NULL;

ALTER TABLE professor_api_tokens ALTER COLUMN tenant_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE professor_api_tokens
    ADD CONSTRAINT professor_api_tokens_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS professor_api_tokens_tenant_idx ON professor_api_tokens (tenant_id);

ALTER TABLE professor_api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_api_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS professor_api_tokens_tenant_isolation ON professor_api_tokens;
CREATE POLICY professor_api_tokens_tenant_isolation ON professor_api_tokens
  FOR ALL
  USING (tenant_id::text = sol_tenant_guc())
  WITH CHECK (tenant_id::text = sol_tenant_guc());

-- ---------------------------------------------------------------------------
-- audit_log: ENABLE + FORCE; SELECT by tenant; no UPDATE/DELETE for sol_app
-- ---------------------------------------------------------------------------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
CREATE POLICY audit_log_tenant_select ON audit_log
  FOR SELECT
  USING (
    tenant_id IS NOT NULL AND tenant_id::text = sol_tenant_guc()
  );
-- Inserts go through append_audit (SECURITY DEFINER); deny direct INSERT for table owner bypass via FORCE still applies to table owner too.
DROP POLICY IF EXISTS audit_log_tenant_insert ON audit_log;
CREATE POLICY audit_log_tenant_insert ON audit_log
  FOR INSERT
  WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id::text = sol_tenant_guc())
    OR (tenant_id IS NULL AND current_setting('app.audit_platform', true) = '1')
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    REVOKE UPDATE, DELETE ON audit_log FROM sol_app;
    GRANT INSERT, SELECT ON audit_log TO sol_app;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers (prefer owner sol_migrator)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_api_token(p_token_hash text)
RETURNS TABLE (
  token_id uuid,
  user_id uuid,
  tenant_id uuid,
  scopes jsonb,
  revoked_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.tenant_id,
    t.scopes,
    t.revoked_at,
    t.expires_at
  FROM professor_api_tokens t
  WHERE t.token_hash = p_token_hash
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION append_audit(
  p_actor_user_id uuid,
  p_actor_clerk_id text,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_metadata jsonb,
  p_tenant_id uuid,
  p_ip text,
  p_user_agent text,
  p_platform boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_tenant_id IS NULL AND NOT COALESCE(p_platform, false) THEN
    RAISE EXCEPTION 'append_audit: tenant_id required unless platform event';
  END IF;
  IF COALESCE(p_platform, false) THEN
    PERFORM set_config('app.audit_platform', '1', true);
  ELSE
    PERFORM set_config('app.audit_platform', '0', true);
    IF p_tenant_id IS NOT NULL THEN
      PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
    END IF;
  END IF;

  INSERT INTO audit_log (
    actor_user_id, actor_clerk_id, action, target_type, target_id,
    metadata, tenant_id, ip, user_agent
  ) VALUES (
    p_actor_user_id, p_actor_clerk_id, p_action, p_target_type, p_target_id,
    p_metadata, p_tenant_id, p_ip, p_user_agent
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_lti_platform(p_issuer text, p_client_id text)
RETURNS TABLE (
  platform_id uuid,
  workspace_id uuid,
  tenant_id uuid,
  issuer text,
  client_id text,
  auth_login_url text,
  auth_token_url text,
  key_set_url text,
  label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.workspace_id,
    COALESCE(p.tenant_id, tenant_root(p.workspace_id)),
    p.issuer,
    p.client_id,
    p.auth_login_url,
    p.auth_token_url,
    p.key_set_url,
    p.label
  FROM lti_platforms p
  WHERE p.issuer = p_issuer AND p.client_id = p_client_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_api_token(text) TO sol_app;
GRANT EXECUTE ON FUNCTION append_audit(uuid, text, text, text, text, jsonb, uuid, text, text, boolean) TO sol_app;
GRANT EXECUTE ON FUNCTION resolve_lti_platform(text, text) TO sol_app;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_migrator') THEN
    EXECUTE 'ALTER FUNCTION tenant_root(uuid) OWNER TO sol_migrator';
    EXECUTE 'ALTER FUNCTION resolve_api_token(text) OWNER TO sol_migrator';
    EXECUTE 'ALTER FUNCTION append_audit(uuid, text, text, text, text, jsonb, uuid, text, text, boolean) OWNER TO sol_migrator';
    EXECUTE 'ALTER FUNCTION resolve_lti_platform(text, text) OWNER TO sol_migrator';
  ELSE
    RAISE NOTICE 'sol_migrator role missing; SECURITY DEFINER functions owned by current_user';
  END IF;
END $$;
