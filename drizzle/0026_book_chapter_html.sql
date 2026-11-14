-- Sanitized HTML body for hosted book chapter reader (markdown kept for RAG).
ALTER TABLE "book_chapters" ADD COLUMN IF NOT EXISTS "html" text;
