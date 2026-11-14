-- Phase 2: scoped grants + time-limited platform support access.

CREATE TABLE IF NOT EXISTS grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (
    scope_type IN ('organization', 'department', 'offering', 'section')
  ),
  scope_id uuid NOT NULL,
  role text NOT NULL CHECK (
    role IN ('owner', 'admin', 'instructor', 'ta', 'grader', 'learner')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS grants_tenant_user_idx
  ON grants (tenant_id, user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS grants_scope_idx
  ON grants (scope_type, scope_id)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS grants_active_scope_role_uidx
  ON grants (tenant_id, user_id, scope_type, scope_id, role)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS support_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_access_grants_user_tenant_idx
  ON support_access_grants (user_id, tenant_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS support_access_grants_expires_idx
  ON support_access_grants (expires_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON grants TO sol_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON support_access_grants TO sol_app;
  END IF;
END
$$;
