-- Scoped role bindings cutover: rename grants → role_bindings, expand roles,
-- platform_staff flag, backfill from memberships / professor_sections / old grants.
-- LOCAL + sol-knowledge-dev only. Never run against production.

-- 1) platform_staff on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform_staff boolean NOT NULL DEFAULT false;

UPDATE users SET platform_staff = true WHERE role = 'ADMIN' AND platform_staff = false;

-- 2) Rename grants → role_bindings (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'grants'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'role_bindings'
  ) THEN
    ALTER TABLE grants RENAME TO role_bindings;
  END IF;
END
$$;

-- Indexes rename if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grants_tenant_user_idx') THEN
    ALTER INDEX grants_tenant_user_idx RENAME TO role_bindings_tenant_user_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grants_scope_idx') THEN
    ALTER INDEX grants_scope_idx RENAME TO role_bindings_scope_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grants_active_scope_role_uidx') THEN
    ALTER INDEX grants_active_scope_role_uidx RENAME TO role_bindings_active_scope_role_uidx;
  END IF;
END
$$;

ALTER TABLE role_bindings
  ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- 3) Expand role check: drop old CHECK, add new
ALTER TABLE role_bindings DROP CONSTRAINT IF EXISTS grants_role_check;
ALTER TABLE role_bindings DROP CONSTRAINT IF EXISTS role_bindings_role_check;

-- Map legacy instructor → lead_instructor, drop learner bindings (seat/enrollment only)
UPDATE role_bindings
SET role = 'lead_instructor'
WHERE role = 'instructor' AND revoked_at IS NULL;

UPDATE role_bindings
SET revoked_at = now()
WHERE role = 'learner' AND revoked_at IS NULL;

ALTER TABLE role_bindings
  ADD CONSTRAINT role_bindings_role_check CHECK (
    role IN (
      'owner',
      'admin',
      'faculty',
      'lead_instructor',
      'co_instructor',
      'ta',
      'grader'
    )
  );

-- Ensure unique active binding
CREATE UNIQUE INDEX IF NOT EXISTS role_bindings_active_scope_role_uidx
  ON role_bindings (tenant_id, user_id, scope_type, scope_id, role)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS role_bindings_tenant_user_idx
  ON role_bindings (tenant_id, user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS role_bindings_scope_idx
  ON role_bindings (scope_type, scope_id)
  WHERE revoked_at IS NULL;

-- 4) Backfill org bindings from workspace_memberships
INSERT INTO role_bindings (tenant_id, user_id, scope_type, scope_id, role, created_at)
SELECT
  m.workspace_id,
  m.user_id,
  'organization',
  m.workspace_id,
  CASE m.role
    WHEN 'owner' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    WHEN 'instructor' THEN 'faculty'
    ELSE NULL
  END,
  now()
FROM workspace_memberships m
WHERE m.status = 'active'
  AND m.role IN ('owner', 'admin', 'instructor')
  AND NOT EXISTS (
    SELECT 1 FROM role_bindings b
    WHERE b.tenant_id = m.workspace_id
      AND b.user_id = m.user_id
      AND b.scope_type = 'organization'
      AND b.scope_id = m.workspace_id
      AND b.role = CASE m.role
        WHEN 'owner' THEN 'owner'
        WHEN 'admin' THEN 'admin'
        WHEN 'instructor' THEN 'faculty'
      END
      AND b.revoked_at IS NULL
  );

-- 5) Elevate faculty → lead_instructor on offerings for professor_sections
INSERT INTO role_bindings (tenant_id, user_id, scope_type, scope_id, role, created_at)
SELECT DISTINCT
  COALESCE(s.tenant_id, s.workspace_id, c.workspace_id),
  ps.professor_id,
  'offering',
  s.offering_id,
  'lead_instructor',
  now()
FROM professor_sections ps
JOIN sections s ON s.id = ps.section_id
LEFT JOIN courses c ON c.id = s.course_id
WHERE s.offering_id IS NOT NULL
  AND COALESCE(s.tenant_id, s.workspace_id, c.workspace_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_bindings b
    WHERE b.tenant_id = COALESCE(s.tenant_id, s.workspace_id, c.workspace_id)
      AND b.user_id = ps.professor_id
      AND b.scope_type = 'offering'
      AND b.scope_id = s.offering_id
      AND b.role = 'lead_instructor'
      AND b.revoked_at IS NULL
  );

-- Sections without offering: bind lead_instructor at section scope
INSERT INTO role_bindings (tenant_id, user_id, scope_type, scope_id, role, created_at)
SELECT DISTINCT
  COALESCE(s.tenant_id, s.workspace_id, c.workspace_id),
  ps.professor_id,
  'section',
  s.id,
  'lead_instructor',
  now()
FROM professor_sections ps
JOIN sections s ON s.id = ps.section_id
LEFT JOIN courses c ON c.id = s.course_id
WHERE s.offering_id IS NULL
  AND COALESCE(s.tenant_id, s.workspace_id, c.workspace_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_bindings b
    WHERE b.tenant_id = COALESCE(s.tenant_id, s.workspace_id, c.workspace_id)
      AND b.user_id = ps.professor_id
      AND b.scope_type = 'section'
      AND b.scope_id = s.id
      AND b.role = 'lead_instructor'
      AND b.revoked_at IS NULL
  );

-- 6) Demote TA/grader-only members who were wrongly elevated to instructor membership
UPDATE workspace_memberships m
SET role = 'learner', updated_at = now()
WHERE m.status = 'active'
  AND m.role = 'instructor'
  AND EXISTS (
    SELECT 1 FROM role_bindings b
    WHERE b.user_id = m.user_id
      AND b.tenant_id = m.workspace_id
      AND b.role IN ('ta', 'grader')
      AND b.revoked_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_bindings b
    WHERE b.user_id = m.user_id
      AND b.tenant_id = m.workspace_id
      AND b.role IN ('owner', 'admin', 'faculty', 'lead_instructor', 'co_instructor')
      AND b.revoked_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM professor_sections ps
    JOIN sections s ON s.id = ps.section_id
    WHERE ps.professor_id = m.user_id
      AND COALESCE(s.tenant_id, s.workspace_id) = m.workspace_id
  );

-- Revoke erroneous org faculty bindings for TA-only users
UPDATE role_bindings b
SET revoked_at = now()
WHERE b.role = 'faculty'
  AND b.scope_type = 'organization'
  AND b.revoked_at IS NULL
  AND EXISTS (
    SELECT 1 FROM role_bindings t
    WHERE t.user_id = b.user_id
      AND t.tenant_id = b.tenant_id
      AND t.role IN ('ta', 'grader')
      AND t.revoked_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_bindings o
    WHERE o.user_id = b.user_id
      AND o.tenant_id = b.tenant_id
      AND o.role IN ('owner', 'admin', 'lead_instructor', 'co_instructor')
      AND o.revoked_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM professor_sections ps
    JOIN sections s ON s.id = ps.section_id
    WHERE ps.professor_id = b.user_id
      AND COALESCE(s.tenant_id, s.workspace_id) = b.tenant_id
  );

-- 7) Section staff invites (email-bound TA/grader before account exists)
CREATE TABLE IF NOT EXISTS section_staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('ta', 'grader')),
  token_hash text NOT NULL,
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  claimed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS section_staff_invites_token_hash_unique
  ON section_staff_invites (token_hash);

CREATE INDEX IF NOT EXISTS section_staff_invites_section_idx
  ON section_staff_invites (section_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON section_staff_invites TO sol_app;
  END IF;
END
$$;

ALTER TABLE section_staff_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_staff_invites FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON section_staff_invites;
CREATE POLICY tenant_isolation ON section_staff_invites
  USING (
    tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
  )
  WITH CHECK (
    tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
  );

-- 8) RLS: point policies at role_bindings if grants was renamed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON role_bindings TO sol_app;
  END IF;
END
$$;

-- Re-apply tenant RLS on role_bindings (same pattern as grants)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'role_bindings'
  ) THEN
    ALTER TABLE role_bindings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE role_bindings FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON role_bindings;
    DROP POLICY IF EXISTS tenant_isolation ON grants;
    CREATE POLICY tenant_isolation ON role_bindings
      USING (
        tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
      )
      WITH CHECK (
        tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
      );
  END IF;
END
$$;
