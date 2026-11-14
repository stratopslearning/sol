ALTER TABLE "student_sections" ADD COLUMN IF NOT EXISTS "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "section_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sol_section_id" uuid NOT NULL,
	"external_kind" text NOT NULL,
	"external_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "section_links_external_kind_check" CHECK ("external_kind" IN ('lti', 'alias')),
	CONSTRAINT "section_links_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "section_links_sol_section_id_fk" FOREIGN KEY ("sol_section_id") REFERENCES "sections"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "section_links_tenant_kind_external_uidx" ON "section_links" ("tenant_id","external_kind","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_links_section_idx" ON "section_links" ("sol_section_id");
