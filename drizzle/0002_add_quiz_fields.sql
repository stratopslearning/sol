-- Add maxAttempts column to quizzes table
ALTER TABLE "quizzes" ADD COLUMN "max_attempts" integer DEFAULT 1 NOT NULL;

-- Add startDate column to quizzes table
ALTER TABLE "quizzes" ADD COLUMN "start_date" timestamp;

-- Add endDate column to quizzes table
ALTER TABLE "quizzes" ADD COLUMN "end_date" timestamp; 