-- Owner invite tokens for client-owned workspace onboarding (local/dev).

CREATE TABLE IF NOT EXISTS "workspace_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_claimed_by_user_id_users_id_fk"
  FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invites_token_hash_unique"
  ON "workspace_invites" ("token_hash");
CREATE INDEX IF NOT EXISTS "workspace_invites_workspace_idx"
  ON "workspace_invites" ("workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_invites_email_idx"
  ON "workspace_invites" ("email");
