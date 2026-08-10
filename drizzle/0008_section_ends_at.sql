-- Section end date for Canvas-style conclude / student archive.
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "ends_at" timestamp with time zone;
