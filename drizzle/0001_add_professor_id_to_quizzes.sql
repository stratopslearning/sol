-- Add professor_id column to quizzes table
ALTER TABLE "quizzes" ADD COLUMN "professor_id" uuid NOT NULL;

-- Make course_id optional by removing NOT NULL constraint
ALTER TABLE "quizzes" ALTER COLUMN "course_id" DROP NOT NULL;

-- Add foreign key constraint for professor_id
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_professor_id_users_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Update existing quizzes to set professor_id based on their course's professor
UPDATE "quizzes" 
SET "professor_id" = (
  SELECT "professor_id" 
  FROM "courses" 
  WHERE "courses"."id" = "quizzes"."course_id"
); 