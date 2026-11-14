-- Canvas LTI 1.3 Advantage: platforms, deployments, section links, users, line items, passback jobs.

CREATE TABLE IF NOT EXISTS "lti_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer" text NOT NULL,
	"client_id" text NOT NULL,
	"auth_login_url" text NOT NULL,
	"auth_token_url" text NOT NULL,
	"key_set_url" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lti_platforms_issuer_client_unique"
  ON "lti_platforms" ("issuer", "client_id");

CREATE TABLE IF NOT EXISTS "lti_deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_id" uuid NOT NULL,
	"deployment_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "lti_deployments" ADD CONSTRAINT "lti_deployments_platform_id_lti_platforms_id_fk"
  FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "lti_deployments_platform_deployment_unique"
  ON "lti_deployments" ("platform_id", "deployment_id");
CREATE INDEX IF NOT EXISTS "lti_deployments_platform_idx"
  ON "lti_deployments" ("platform_id");

CREATE TABLE IF NOT EXISTS "lti_section_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"deployment_id" uuid NOT NULL,
	"canvas_course_id" text NOT NULL,
	"canvas_section_id" text,
	"context_id" text,
	"ags_line_items_url" text,
	"nrps_memberships_url" text,
	"linked_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "lti_section_links" ADD CONSTRAINT "lti_section_links_section_id_sections_id_fk"
  FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_section_links" ADD CONSTRAINT "lti_section_links_deployment_id_lti_deployments_id_fk"
  FOREIGN KEY ("deployment_id") REFERENCES "public"."lti_deployments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_section_links" ADD CONSTRAINT "lti_section_links_linked_by_user_id_users_id_fk"
  FOREIGN KEY ("linked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "lti_section_links_section_unique"
  ON "lti_section_links" ("section_id");
CREATE INDEX IF NOT EXISTS "lti_section_links_deployment_idx"
  ON "lti_section_links" ("deployment_id");
CREATE INDEX IF NOT EXISTS "lti_section_links_canvas_course_idx"
  ON "lti_section_links" ("canvas_course_id");

CREATE TABLE IF NOT EXISTS "lti_user_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"lti_user_id" text NOT NULL,
	"email_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "lti_user_links" ADD CONSTRAINT "lti_user_links_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_user_links" ADD CONSTRAINT "lti_user_links_platform_id_lti_platforms_id_fk"
  FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "lti_user_links_platform_user_unique"
  ON "lti_user_links" ("platform_id", "lti_user_id");
CREATE INDEX IF NOT EXISTS "lti_user_links_user_idx"
  ON "lti_user_links" ("user_id");

CREATE TABLE IF NOT EXISTS "lti_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_link_id" uuid NOT NULL,
	"course_activity_id" uuid,
	"quiz_id" uuid,
	"lesson_id" uuid,
	"chatbot_id" uuid,
	"interactive_id" uuid,
	"resource_id" text NOT NULL,
	"line_item_id" text,
	"line_item_url" text,
	"score_maximum" integer DEFAULT 100 NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_section_link_id_lti_section_links_id_fk"
  FOREIGN KEY ("section_link_id") REFERENCES "public"."lti_section_links"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_course_activity_id_course_activities_id_fk"
  FOREIGN KEY ("course_activity_id") REFERENCES "public"."course_activities"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_quiz_id_quizzes_id_fk"
  FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_lesson_id_lessons_id_fk"
  FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_chatbot_id_chatbots_id_fk"
  FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_interactive_id_interactives_id_fk"
  FOREIGN KEY ("interactive_id") REFERENCES "public"."interactives"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "lti_line_items_section_resource_unique"
  ON "lti_line_items" ("section_link_id", "resource_id");
CREATE INDEX IF NOT EXISTS "lti_line_items_section_link_idx"
  ON "lti_line_items" ("section_link_id");

CREATE TABLE IF NOT EXISTS "lti_passback_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"line_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_id" uuid,
	"score_given" integer,
	"score_maximum" integer DEFAULT 100 NOT NULL,
	"activity_progress" text DEFAULT 'Completed' NOT NULL,
	"grading_progress" text DEFAULT 'FullyGraded' NOT NULL,
	"comment" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "lti_passback_jobs" ADD CONSTRAINT "lti_passback_jobs_line_item_id_lti_line_items_id_fk"
  FOREIGN KEY ("line_item_id") REFERENCES "public"."lti_line_items"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_passback_jobs" ADD CONSTRAINT "lti_passback_jobs_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lti_passback_jobs" ADD CONSTRAINT "lti_passback_jobs_attempt_id_attempts_id_fk"
  FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "lti_passback_jobs_idempotency_unique"
  ON "lti_passback_jobs" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "lti_passback_jobs_status_idx"
  ON "lti_passback_jobs" ("status");
CREATE INDEX IF NOT EXISTS "lti_passback_jobs_line_item_idx"
  ON "lti_passback_jobs" ("line_item_id");
