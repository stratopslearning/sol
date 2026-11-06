-- Knowledge module: course materials + embedding chunks (pgvector).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "course_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"source_type" text NOT NULL,
	"mime_type" text,
	"byte_size" integer,
	"s3_key" text,
	"external_url" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_material_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer,
	"embedding" vector(1536),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "course_material_chunks" ADD CONSTRAINT "course_material_chunks_material_id_course_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."course_materials"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "course_material_chunks" ADD CONSTRAINT "course_material_chunks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "course_materials_course_idx" ON "course_materials" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "course_materials_course_status_idx" ON "course_materials" USING btree ("course_id","status");
CREATE INDEX IF NOT EXISTS "course_material_chunks_material_idx" ON "course_material_chunks" USING btree ("material_id");
CREATE INDEX IF NOT EXISTS "course_material_chunks_course_idx" ON "course_material_chunks" USING btree ("course_id");
