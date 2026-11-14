-- Authoring module: course outlines, modules, items, refine chat messages.
CREATE TABLE IF NOT EXISTS "course_outlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"brief" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "outline_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outline_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"position" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "outline_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_material_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_quiz_id" uuid,
	"published_chatbot_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "authoring_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outline_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "course_outlines" ADD CONSTRAINT "course_outlines_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "course_outlines" ADD CONSTRAINT "course_outlines_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "outline_modules" ADD CONSTRAINT "outline_modules_outline_id_course_outlines_id_fk" FOREIGN KEY ("outline_id") REFERENCES "public"."course_outlines"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "outline_items" ADD CONSTRAINT "outline_items_module_id_outline_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."outline_modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "outline_items" ADD CONSTRAINT "outline_items_published_quiz_id_quizzes_id_fk" FOREIGN KEY ("published_quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "outline_items" ADD CONSTRAINT "outline_items_published_chatbot_id_chatbots_id_fk" FOREIGN KEY ("published_chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "authoring_messages" ADD CONSTRAINT "authoring_messages_outline_id_course_outlines_id_fk" FOREIGN KEY ("outline_id") REFERENCES "public"."course_outlines"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "course_outlines_course_idx" ON "course_outlines" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "course_outlines_course_status_idx" ON "course_outlines" USING btree ("course_id","status");
CREATE INDEX IF NOT EXISTS "outline_modules_outline_idx" ON "outline_modules" USING btree ("outline_id");
CREATE INDEX IF NOT EXISTS "outline_items_module_idx" ON "outline_items" USING btree ("module_id");
CREATE INDEX IF NOT EXISTS "authoring_messages_outline_idx" ON "authoring_messages" USING btree ("outline_id");
