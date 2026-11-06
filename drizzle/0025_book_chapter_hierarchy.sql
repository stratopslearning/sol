-- Chapter → sub-chapter tree for hosted books (EPUB / webbook / Pressbooks XML).
ALTER TABLE "book_chapters" ADD COLUMN IF NOT EXISTS "parent_id" uuid;
--> statement-breakpoint
ALTER TABLE "book_chapters" ADD COLUMN IF NOT EXISTS "level" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "book_chapters"
    ADD CONSTRAINT "book_chapters_parent_id_book_chapters_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."book_chapters"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_chapters_parent_idx" ON "book_chapters" USING btree ("parent_id");
