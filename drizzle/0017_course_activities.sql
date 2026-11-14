-- Unified Assignments registry + H5P-inspired interactives.

CREATE TABLE IF NOT EXISTS "interactives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professor_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"package_storage_key" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"source_outline_item_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interactive_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interactive_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interactive_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interactive_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'STARTED' NOT NULL,
	"completed_at" timestamp with time zone,
	"xapi_summary" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid,
	"professor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"quiz_id" uuid,
	"lesson_id" uuid,
	"chatbot_id" uuid,
	"interactive_id" uuid,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_outline_item_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "interactives" ADD CONSTRAINT "interactives_professor_id_users_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "interactives" ADD CONSTRAINT "interactives_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interactive_sections" ADD CONSTRAINT "interactive_sections_interactive_id_interactives_id_fk" FOREIGN KEY ("interactive_id") REFERENCES "public"."interactives"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interactive_sections" ADD CONSTRAINT "interactive_sections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interactive_sections" ADD CONSTRAINT "interactive_sections_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "interactive_progress" ADD CONSTRAINT "interactive_progress_interactive_id_interactives_id_fk" FOREIGN KEY ("interactive_id") REFERENCES "public"."interactives"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interactive_progress" ADD CONSTRAINT "interactive_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "course_activities" ADD CONSTRAINT "course_activities_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "course_activities" ADD CONSTRAINT "course_activities_professor_id_users_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "course_activities" ADD CONSTRAINT "course_activities_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "course_activities" ADD CONSTRAINT "course_activities_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "course_activities" ADD CONSTRAINT "course_activities_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "course_activities" ADD CONSTRAINT "course_activities_interactive_id_interactives_id_fk" FOREIGN KEY ("interactive_id") REFERENCES "public"."interactives"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "outline_items" ADD COLUMN IF NOT EXISTS "published_interactive_id" uuid;
DO $$ BEGIN
  ALTER TABLE "outline_items" ADD CONSTRAINT "outline_items_published_interactive_id_interactives_id_fk" FOREIGN KEY ("published_interactive_id") REFERENCES "public"."interactives"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow INTERACTIVE in outline_items.type (text column; app enforces enum).

CREATE INDEX IF NOT EXISTS "interactives_course_idx" ON "interactives" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "interactives_professor_idx" ON "interactives" USING btree ("professor_id");
CREATE UNIQUE INDEX IF NOT EXISTS "interactive_sections_unique" ON "interactive_sections" USING btree ("interactive_id","section_id");
CREATE INDEX IF NOT EXISTS "interactive_sections_section_idx" ON "interactive_sections" USING btree ("section_id");
CREATE UNIQUE INDEX IF NOT EXISTS "interactive_progress_unique" ON "interactive_progress" USING btree ("interactive_id","student_id");
CREATE INDEX IF NOT EXISTS "interactive_progress_student_idx" ON "interactive_progress" USING btree ("student_id");

CREATE INDEX IF NOT EXISTS "course_activities_course_idx" ON "course_activities" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "course_activities_professor_idx" ON "course_activities" USING btree ("professor_id");
CREATE INDEX IF NOT EXISTS "course_activities_type_idx" ON "course_activities" USING btree ("type");
CREATE UNIQUE INDEX IF NOT EXISTS "course_activities_quiz_unique" ON "course_activities" USING btree ("quiz_id");
CREATE UNIQUE INDEX IF NOT EXISTS "course_activities_lesson_unique" ON "course_activities" USING btree ("lesson_id");
CREATE UNIQUE INDEX IF NOT EXISTS "course_activities_chatbot_unique" ON "course_activities" USING btree ("chatbot_id");
CREATE UNIQUE INDEX IF NOT EXISTS "course_activities_interactive_unique" ON "course_activities" USING btree ("interactive_id");

-- Backfill activities from existing quizzes (course via first section when available).
INSERT INTO "course_activities" (
  "course_id", "professor_id", "type", "title", "description",
  "quiz_id", "start_date", "end_date", "is_active", "source_outline_item_id",
  "created_at", "updated_at"
)
SELECT
  (
    SELECT s.course_id
    FROM quiz_sections qs
    JOIN sections s ON s.id = qs.section_id
    WHERE qs.quiz_id = q.id
    LIMIT 1
  ),
  q.professor_id,
  'QUIZ',
  q.title,
  q.description,
  q.id,
  q.start_date,
  q.end_date,
  q.is_active,
  q.source_outline_item_id,
  q.created_at,
  q.updated_at
FROM quizzes q
WHERE q.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM course_activities ca WHERE ca.quiz_id = q.id
  );

-- Backfill lessons
INSERT INTO "course_activities" (
  "course_id", "professor_id", "type", "title", "description",
  "lesson_id", "is_active", "source_outline_item_id",
  "created_at", "updated_at"
)
SELECT
  l.course_id,
  l.professor_id,
  'LESSON',
  l.title,
  NULL,
  l.id,
  l.is_active,
  l.source_outline_item_id,
  l.created_at,
  l.updated_at
FROM lessons l
WHERE l.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM course_activities ca WHERE ca.lesson_id = l.id
  );

-- Backfill discussions (non-template chatbots)
INSERT INTO "course_activities" (
  "course_id", "professor_id", "type", "title", "description",
  "chatbot_id", "is_active",
  "created_at", "updated_at"
)
SELECT
  (
    SELECT s.course_id
    FROM chatbot_sections cs
    JOIN sections s ON s.id = cs.section_id
    WHERE cs.chatbot_id = c.id
    LIMIT 1
  ),
  c.professor_id,
  'DISCUSSION',
  c.title,
  c.description,
  c.id,
  c.is_active,
  c.created_at,
  c.updated_at
FROM chatbots c
WHERE c.deleted_at IS NULL
  AND c.is_template = false
  AND c.professor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM course_activities ca WHERE ca.chatbot_id = c.id
  );
