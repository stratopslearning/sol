-- Phase 2 expand: nullable tenant_id (+ offering_id where scoped) on teaching tables.
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "quiz_sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "quiz_sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "grading_cache" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "grading_cache" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbot_sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbot_sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbot_assignments" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbot_assignments" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "professor_sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "professor_sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "student_sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "student_sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "course_material_chunks" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "interactives" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "interactives" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "interactive_sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "interactive_sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "interactive_progress" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "course_activities" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "course_outlines" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "outline_modules" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "outline_items" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "authoring_revisions" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "authoring_messages" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "course_knowledge_links" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "hosted_books" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "book_chapters" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "book_sections" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "book_sections" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_section_links" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_section_links" ADD COLUMN IF NOT EXISTS "offering_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_user_links" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_line_items" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_passback_jobs" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
UPDATE "sections" s
SET "tenant_id" = COALESCE(s."workspace_id", c."workspace_id")
FROM "courses" c
WHERE c."id" = s."course_id"
  AND s."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "professor_sections" ps
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = ps."section_id"
  AND (ps."tenant_id" IS NULL OR ps."offering_id" IS NULL);--> statement-breakpoint
UPDATE "student_sections" ss
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = ss."section_id"
  AND (ss."tenant_id" IS NULL OR ss."offering_id" IS NULL);--> statement-breakpoint
UPDATE "quiz_sections" qs
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = qs."section_id"
  AND (qs."tenant_id" IS NULL OR qs."offering_id" IS NULL);--> statement-breakpoint
UPDATE "quizzes" q
SET
  "tenant_id" = sub."tenant_id",
  "offering_id" = sub."offering_id"
FROM (
  SELECT DISTINCT ON (qs."quiz_id")
    qs."quiz_id",
    s."tenant_id",
    s."offering_id"
  FROM "quiz_sections" qs
  JOIN "sections" s ON s."id" = qs."section_id"
  ORDER BY qs."quiz_id", qs."assigned_at" ASC
) sub
WHERE q."id" = sub."quiz_id"
  AND (q."tenant_id" IS NULL OR q."offering_id" IS NULL);--> statement-breakpoint
UPDATE "questions" q
SET
  "tenant_id" = qu."tenant_id",
  "offering_id" = qu."offering_id"
FROM "quizzes" qu
WHERE qu."id" = q."quiz_id"
  AND (q."tenant_id" IS NULL OR q."offering_id" IS NULL);--> statement-breakpoint
UPDATE "assignments" a
SET
  "tenant_id" = q."tenant_id",
  "offering_id" = q."offering_id"
FROM "quizzes" q
WHERE q."id" = a."quiz_id"
  AND (a."tenant_id" IS NULL OR a."offering_id" IS NULL);--> statement-breakpoint
UPDATE "attempts" a
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = a."section_id"
  AND (a."tenant_id" IS NULL OR a."offering_id" IS NULL);--> statement-breakpoint
UPDATE "grading_cache" gc
SET
  "tenant_id" = q."tenant_id",
  "offering_id" = q."offering_id"
FROM "questions" qu
JOIN "quizzes" q ON q."id" = qu."quiz_id"
WHERE qu."id" = gc."question_id"
  AND (gc."tenant_id" IS NULL OR gc."offering_id" IS NULL);--> statement-breakpoint
UPDATE "chatbot_sections" cs
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = cs."section_id"
  AND (cs."tenant_id" IS NULL OR cs."offering_id" IS NULL);--> statement-breakpoint
UPDATE "chatbots" cb
SET
  "tenant_id" = sub."tenant_id",
  "offering_id" = sub."offering_id"
FROM (
  SELECT DISTINCT ON (cs."chatbot_id")
    cs."chatbot_id",
    s."tenant_id",
    s."offering_id"
  FROM "chatbot_sections" cs
  JOIN "sections" s ON s."id" = cs."section_id"
  ORDER BY cs."chatbot_id", cs."assigned_at" ASC
) sub
WHERE cb."id" = sub."chatbot_id"
  AND (cb."tenant_id" IS NULL OR cb."offering_id" IS NULL);--> statement-breakpoint
UPDATE "chatbot_assignments" ca
SET
  "tenant_id" = cb."tenant_id",
  "offering_id" = cb."offering_id"
FROM "chatbots" cb
WHERE cb."id" = ca."chatbot_id"
  AND (ca."tenant_id" IS NULL OR ca."offering_id" IS NULL);--> statement-breakpoint
UPDATE "chatbot_sessions" cs
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = cs."section_id"
  AND (cs."tenant_id" IS NULL OR cs."offering_id" IS NULL);--> statement-breakpoint
UPDATE "course_materials" cm
SET
  "tenant_id" = c."workspace_id",
  "offering_id" = co."id"
FROM "courses" c
LEFT JOIN "course_offerings" co
  ON co."course_id" = c."id" AND co."term_label" = 'default'
WHERE c."id" = cm."course_id"
  AND (cm."tenant_id" IS NULL OR cm."offering_id" IS NULL);--> statement-breakpoint
UPDATE "course_material_chunks" cmc
SET "tenant_id" = c."workspace_id"
FROM "courses" c
WHERE c."id" = cmc."course_id"
  AND cmc."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "lessons" l
SET
  "tenant_id" = c."workspace_id",
  "offering_id" = co."id"
FROM "courses" c
LEFT JOIN "course_offerings" co
  ON co."course_id" = c."id" AND co."term_label" = 'default'
WHERE c."id" = l."course_id"
  AND (l."tenant_id" IS NULL OR l."offering_id" IS NULL);--> statement-breakpoint
UPDATE "lesson_sections" ls
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = ls."section_id"
  AND (ls."tenant_id" IS NULL OR ls."offering_id" IS NULL);--> statement-breakpoint
UPDATE "flashcards" f
SET "tenant_id" = l."tenant_id"
FROM "lessons" l
WHERE l."id" = f."lesson_id"
  AND f."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "lesson_progress" lp
SET "tenant_id" = l."tenant_id"
FROM "lessons" l
WHERE l."id" = lp."lesson_id"
  AND lp."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "interactives" i
SET
  "tenant_id" = c."workspace_id",
  "offering_id" = co."id"
FROM "courses" c
LEFT JOIN "course_offerings" co
  ON co."course_id" = c."id" AND co."term_label" = 'default'
WHERE c."id" = i."course_id"
  AND (i."tenant_id" IS NULL OR i."offering_id" IS NULL);--> statement-breakpoint
UPDATE "interactive_sections" ins
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = ins."section_id"
  AND (ins."tenant_id" IS NULL OR ins."offering_id" IS NULL);--> statement-breakpoint
UPDATE "interactive_progress" ip
SET "tenant_id" = i."tenant_id"
FROM "interactives" i
WHERE i."id" = ip."interactive_id"
  AND ip."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "course_activities" ca
SET "tenant_id" = c."workspace_id"
FROM "courses" c
WHERE c."id" = ca."course_id"
  AND ca."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "course_outlines" co
SET "tenant_id" = c."workspace_id"
FROM "courses" c
WHERE c."id" = co."course_id"
  AND co."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "outline_modules" om
SET "tenant_id" = co."tenant_id"
FROM "course_outlines" co
WHERE co."id" = om."outline_id"
  AND om."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "outline_items" oi
SET "tenant_id" = co."tenant_id"
FROM "outline_modules" om
JOIN "course_outlines" co ON co."id" = om."outline_id"
WHERE om."id" = oi."module_id"
  AND oi."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "authoring_revisions" ar
SET "tenant_id" = co."tenant_id"
FROM "course_outlines" co
WHERE co."id" = ar."outline_id"
  AND ar."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "authoring_messages" am
SET "tenant_id" = co."tenant_id"
FROM "course_outlines" co
WHERE co."id" = am."outline_id"
  AND am."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "course_knowledge_links" ckl
SET "tenant_id" = c."workspace_id"
FROM "courses" c
WHERE c."id" = ckl."course_id"
  AND ckl."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "hosted_books" hb
SET "tenant_id" = c."workspace_id"
FROM "courses" c
WHERE c."id" = hb."course_id"
  AND hb."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "book_chapters" bc
SET "tenant_id" = c."workspace_id"
FROM "courses" c
WHERE c."id" = bc."course_id"
  AND bc."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "book_sections" bs
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = bs."section_id"
  AND (bs."tenant_id" IS NULL OR bs."offering_id" IS NULL);--> statement-breakpoint
UPDATE "lti_deployments" ld
SET "tenant_id" = lp."workspace_id"
FROM "lti_platforms" lp
WHERE lp."id" = ld."platform_id"
  AND ld."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "lti_section_links" lsl
SET
  "tenant_id" = s."tenant_id",
  "offering_id" = s."offering_id"
FROM "sections" s
WHERE s."id" = lsl."section_id"
  AND (lsl."tenant_id" IS NULL OR lsl."offering_id" IS NULL);--> statement-breakpoint
UPDATE "lti_user_links" lul
SET "tenant_id" = lp."workspace_id"
FROM "lti_platforms" lp
WHERE lp."id" = lul."platform_id"
  AND lul."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "lti_line_items" lli
SET "tenant_id" = lsl."tenant_id"
FROM "lti_section_links" lsl
WHERE lsl."id" = lli."section_link_id"
  AND lli."tenant_id" IS NULL;--> statement-breakpoint
UPDATE "lti_passback_jobs" lpj
SET "tenant_id" = lli."tenant_id"
FROM "lti_line_items" lli
WHERE lli."id" = lpj."line_item_id"
  AND lpj."tenant_id" IS NULL;--> statement-breakpoint
DO $$
DECLARE
  tbl text;
  idx_cols text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'sections', 'quizzes', 'quiz_sections', 'questions', 'assignments', 'attempts',
    'grading_cache', 'chatbots', 'chatbot_sections', 'chatbot_assignments', 'chatbot_sessions',
    'professor_sections', 'student_sections', 'course_materials', 'course_material_chunks',
    'lessons', 'lesson_sections', 'flashcards', 'lesson_progress', 'interactives',
    'interactive_sections', 'interactive_progress', 'course_activities', 'course_outlines',
    'outline_modules', 'outline_items', 'authoring_revisions', 'authoring_messages',
    'course_knowledge_links', 'hosted_books', 'book_chapters', 'book_sections',
    'lti_deployments', 'lti_section_links', 'lti_user_links', 'lti_line_items', 'lti_passback_jobs'
  ]
  LOOP
    IF tbl = 'grading_cache' THEN
      idx_cols := '"tenant_id"';
    ELSE
      idx_cols := '"tenant_id", "id"';
    END IF;
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I (%s) WHERE "tenant_id" IS NOT NULL',
      tbl || '_tenant_id_id_idx',
      tbl,
      idx_cols
    );
  END LOOP;
END $$;--> statement-breakpoint
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'quizzes', 'quiz_sections', 'questions', 'assignments', 'attempts', 'grading_cache',
    'chatbots', 'chatbot_sections', 'chatbot_assignments', 'chatbot_sessions',
    'professor_sections', 'student_sections', 'course_materials', 'lessons', 'lesson_sections',
    'interactives', 'interactive_sections', 'book_sections', 'lti_section_links'
  ]
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I ("offering_id") WHERE "offering_id" IS NOT NULL',
      tbl || '_offering_idx',
      tbl
    );
  END LOOP;
END $$;
