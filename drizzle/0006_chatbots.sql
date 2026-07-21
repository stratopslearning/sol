-- Socratic discussion chatbots (additive).
-- Tables: chatbots, chatbot_sections, chatbot_assignments, chatbot_sessions.
-- SCM3005 Ch1 template is seeded at runtime via lib/chatbot/seed.ts
-- (keeps the long system prompt in TypeScript, not SQL).

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatbots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "professor_id" uuid,
  "title" text NOT NULL,
  "description" text,
  "persona_name" text DEFAULT 'Professor Emma' NOT NULL,
  "instructions" text NOT NULL,
  "system_prompt" text NOT NULL,
  "related_quiz_id" uuid,
  "is_template" boolean DEFAULT false NOT NULL,
  "model" text DEFAULT 'gpt-4.1-mini' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "chatbots_professor_id_users_id_fk"
    FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "chatbots_related_quiz_id_quizzes_id_fk"
    FOREIGN KEY ("related_quiz_id") REFERENCES "quizzes"("id") ON DELETE set null
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbots_professor_idx" ON "chatbots" ("professor_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbots_related_quiz_idx" ON "chatbots" ("related_quiz_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatbot_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatbot_id" uuid NOT NULL,
  "section_id" uuid NOT NULL,
  "assigned_by" uuid NOT NULL,
  "assigned_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "chatbot_sections_chatbot_id_chatbots_id_fk"
    FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE cascade,
  CONSTRAINT "chatbot_sections_section_id_sections_id_fk"
    FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE cascade,
  CONSTRAINT "chatbot_sections_assigned_by_users_id_fk"
    FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE restrict
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chatbot_sections_unique"
  ON "chatbot_sections" ("chatbot_id", "section_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_sections_section_idx"
  ON "chatbot_sections" ("section_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatbot_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatbot_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "is_completed" boolean DEFAULT false NOT NULL,
  "assigned_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  CONSTRAINT "chatbot_assignments_chatbot_id_chatbots_id_fk"
    FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE cascade,
  CONSTRAINT "chatbot_assignments_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chatbot_assignments_unique"
  ON "chatbot_assignments" ("chatbot_id", "student_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_assignments_student_idx"
  ON "chatbot_assignments" ("student_id");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatbot_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "assignment_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "chatbot_id" uuid NOT NULL,
  "section_id" uuid NOT NULL,
  "messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'in_progress' NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  CONSTRAINT "chatbot_sessions_assignment_id_chatbot_assignments_id_fk"
    FOREIGN KEY ("assignment_id") REFERENCES "chatbot_assignments"("id") ON DELETE cascade,
  CONSTRAINT "chatbot_sessions_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "chatbot_sessions_chatbot_id_chatbots_id_fk"
    FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE cascade,
  CONSTRAINT "chatbot_sessions_section_id_sections_id_fk"
    FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_sessions_assignment_idx"
  ON "chatbot_sessions" ("assignment_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_sessions_student_idx"
  ON "chatbot_sessions" ("student_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_sessions_chatbot_idx"
  ON "chatbot_sessions" ("chatbot_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_sessions_section_idx"
  ON "chatbot_sessions" ("section_id");
