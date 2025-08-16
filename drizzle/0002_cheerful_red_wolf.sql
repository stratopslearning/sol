CREATE TABLE "professor_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professor_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"professor_enrollment_code" text NOT NULL,
	"student_enrollment_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sections_professor_enrollment_code_unique" UNIQUE("professor_enrollment_code"),
	CONSTRAINT "sections_student_enrollment_code_unique" UNIQUE("student_enrollment_code")
);
--> statement-breakpoint
CREATE TABLE "student_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_enrollments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quiz_courses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "course_enrollments" CASCADE;--> statement-breakpoint
DROP TABLE "quiz_courses" CASCADE;--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_enrollment_code_unique";--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_professor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "section_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "professor_sections" ADD CONSTRAINT "professor_sections_professor_id_users_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professor_sections" ADD CONSTRAINT "professor_sections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_sections" ADD CONSTRAINT "quiz_sections_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_sections" ADD CONSTRAINT "quiz_sections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_sections" ADD CONSTRAINT "quiz_sections_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_sections" ADD CONSTRAINT "student_sections_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_sections" ADD CONSTRAINT "student_sections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" DROP COLUMN "course_id";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "professor_id";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "enrollment_code";--> statement-breakpoint
ALTER TABLE "quizzes" DROP COLUMN "course_id";