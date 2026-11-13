-- Workspaces (creator / business / department / institution) + course/LTI tenancy.

CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'department' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"parent_workspace_id" uuid,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_parent_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("parent_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_unique" ON "workspaces" ("slug");
CREATE INDEX IF NOT EXISTS "workspaces_parent_idx" ON "workspaces" ("parent_workspace_id");

CREATE TABLE IF NOT EXISTS "workspace_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'learner' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_memberships_workspace_user_unique"
  ON "workspace_memberships" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "workspace_memberships_user_idx" ON "workspace_memberships" ("user_id");
CREATE INDEX IF NOT EXISTS "workspace_memberships_workspace_idx" ON "workspace_memberships" ("workspace_id");

CREATE TABLE IF NOT EXISTS "workspace_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan" text DEFAULT 'department' NOT NULL,
	"seat_cap" integer DEFAULT 500 NOT NULL,
	"ai_unit_cap" integer,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"billing_provider" text DEFAULT 'manual' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "workspace_licenses" ADD CONSTRAINT "workspace_licenses_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "workspace_licenses_workspace_idx" ON "workspace_licenses" ("workspace_id");

-- Default workspace for existing data (stable UUID used in app code).
INSERT INTO "workspaces" ("id", "slug", "name", "type", "status")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'default',
  'Default workspace',
  'institution',
  'active'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "workspace_licenses" (
  "workspace_id", "plan", "seat_cap", "billing_provider", "status"
)
SELECT
  '00000000-0000-4000-8000-000000000001',
  'institution',
  100000,
  'manual',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_licenses"
  WHERE "workspace_id" = '00000000-0000-4000-8000-000000000001'
);

-- Courses: add workspace_id, backfill, then NOT NULL.
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;

UPDATE "courses"
SET "workspace_id" = '00000000-0000-4000-8000-000000000001'
WHERE "workspace_id" IS NULL;

ALTER TABLE "courses" ALTER COLUMN "workspace_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "courses" ADD CONSTRAINT "courses_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "courses_workspace_idx" ON "courses" ("workspace_id");

-- LTI platforms: scope to workspace.
ALTER TABLE "lti_platforms" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;

UPDATE "lti_platforms"
SET "workspace_id" = '00000000-0000-4000-8000-000000000001'
WHERE "workspace_id" IS NULL;

ALTER TABLE "lti_platforms" ALTER COLUMN "workspace_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "lti_platforms" ADD CONSTRAINT "lti_platforms_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "lti_platforms_issuer_client_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "lti_platforms_workspace_issuer_client_unique"
  ON "lti_platforms" ("workspace_id", "issuer", "client_id");
CREATE INDEX IF NOT EXISTS "lti_platforms_workspace_idx" ON "lti_platforms" ("workspace_id");
