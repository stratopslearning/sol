-- Transactional email support: student invites, ops notification dedupe,
-- workspace access-request queue. RLS + grants for sol_app.

CREATE TABLE IF NOT EXISTS "section_student_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "token_hash" text NOT NULL,
  "invited_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "expires_at" timestamp with time zone NOT NULL,
  "claimed_at" timestamp with time zone,
  "claimed_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "section_student_invites_token_hash_unique"
  ON "section_student_invites" ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_student_invites_section_idx"
  ON "section_student_invites" ("section_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_student_invites_email_idx"
  ON "section_student_invites" ("email");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "period_key" text NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_notifications_workspace_kind_period_uidx"
  ON "email_notifications" ("workspace_id", "kind", "period_key");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "workspace_access_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "name" text,
  "claimed_role" text DEFAULT 'instructor' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "decided_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "decided_at" timestamp with time zone,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_access_requests_workspace_idx"
  ON "workspace_access_requests" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_access_requests_status_idx"
  ON "workspace_access_requests" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_access_requests_email_idx"
  ON "workspace_access_requests" ("email");
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON section_student_invites TO sol_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON email_notifications TO sol_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_access_requests TO sol_app;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE section_student_invites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE section_student_invites FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON section_student_invites;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON section_student_invites
  USING (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), ''));
--> statement-breakpoint

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE email_notifications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS email_notifications_tenant_isolation ON email_notifications;
--> statement-breakpoint
CREATE POLICY email_notifications_tenant_isolation ON email_notifications
  FOR ALL
  USING (workspace_id::text = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (workspace_id::text = NULLIF(current_setting('app.tenant_id', true), ''));
--> statement-breakpoint

ALTER TABLE workspace_access_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE workspace_access_requests FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workspace_access_requests_tenant_isolation ON workspace_access_requests;
--> statement-breakpoint
CREATE POLICY workspace_access_requests_tenant_isolation ON workspace_access_requests
  FOR ALL
  USING (workspace_id::text = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (workspace_id::text = NULLIF(current_setting('app.tenant_id', true), ''));
--> statement-breakpoint

-- Token claim lookup without tenant GUC (mirrors staff invite claim need).
CREATE OR REPLACE FUNCTION sol_find_student_invite_by_token(p_token_hash text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  section_id uuid,
  email text,
  token_hash text,
  invited_by uuid,
  expires_at timestamptz,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.tenant_id, i.section_id, i.email, i.token_hash,
    i.invited_by, i.expires_at, i.claimed_at, i.claimed_by_user_id, i.created_at
  FROM section_student_invites i
  WHERE i.token_hash = p_token_hash
  LIMIT 1;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_find_student_invite_by_token(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sol_find_student_invite_by_token(text) TO sol_app;
