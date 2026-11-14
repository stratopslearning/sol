-- Daily AI usage rollups for workspace AI-band enforcement.

CREATE TABLE IF NOT EXISTS "workspace_usage_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"day" text NOT NULL,
	"grade_units" integer DEFAULT 0 NOT NULL,
	"tutor_units" integer DEFAULT 0 NOT NULL,
	"embed_units" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "workspace_usage_daily" ADD CONSTRAINT "workspace_usage_daily_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_usage_daily_workspace_day_unique"
  ON "workspace_usage_daily" ("workspace_id", "day");
CREATE INDEX IF NOT EXISTS "workspace_usage_daily_workspace_idx"
  ON "workspace_usage_daily" ("workspace_id");
