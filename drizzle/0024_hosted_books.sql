-- Hosted books: Pressbooks webbook / EPUB / Pressbooks XML with chapter reader.
CREATE TABLE IF NOT EXISTS "hosted_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_url" text,
	"s3_key" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"is_released" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "book_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"part_title" text,
	"markdown" text NOT NULL,
	"source_url" text,
	"material_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "book_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hosted_books" ADD CONSTRAINT "hosted_books_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hosted_books" ADD CONSTRAINT "hosted_books_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_hosted_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."hosted_books"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_material_id_course_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."course_materials"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "book_sections" ADD CONSTRAINT "book_sections_book_id_hosted_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."hosted_books"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "book_sections" ADD CONSTRAINT "book_sections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "book_sections" ADD CONSTRAINT "book_sections_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hosted_books_course_idx" ON "hosted_books" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hosted_books_course_status_idx" ON "hosted_books" USING btree ("course_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_chapters_book_idx" ON "book_chapters" USING btree ("book_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_chapters_course_idx" ON "book_chapters" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_chapters_book_position_idx" ON "book_chapters" USING btree ("book_id","position");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "book_sections_unique" ON "book_sections" USING btree ("book_id","section_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_sections_section_idx" ON "book_sections" USING btree ("section_id");
