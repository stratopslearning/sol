-- Wave 3 item 19: offering_id contract for section/course-derived teaching tables.
-- LOCAL + sol-knowledge-dev only. Expand-then-contract.
--   1. every course gets a default offering
--   2. backfill offering_id from section/course
--   3. BEFORE INSERT trigger fills offering_id for legacy writers (keeps old inserts working)
--   4. SET NOT NULL per table ONLY when no NULL rows remain (otherwise WARNING, stays nullable)
-- Tables not derivable from section/course (quizzes, questions, assignments, chatbots,
-- chatbot_assignments, grading_cache, analytics_rollups) stay nullable — tracked in docs/GATE_3_REPORT.md.

--> statement-breakpoint
INSERT INTO course_offerings (course_id, tenant_id, term_label, status)
SELECT c.id, c.tenant_id, 'default', 'active'
FROM courses c
WHERE c.tenant_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM course_offerings o WHERE o.course_id = c.id)
ON CONFLICT DO NOTHING;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_default_offering_for_course(p_course uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT o.id
  FROM course_offerings o
  WHERE o.course_id = p_course
  ORDER BY (o.term_label = 'default') DESC, o.created_at ASC
  LIMIT 1
$$;

--> statement-breakpoint
UPDATE sections s
SET offering_id = sol_default_offering_for_course(s.course_id)
WHERE s.offering_id IS NULL;

--> statement-breakpoint
DO $$
DECLARE
  t text;
  section_tables text[] := ARRAY[
    'professor_sections','student_sections','quiz_sections','attempts',
    'chatbot_sections','lesson_sections','interactive_sections','book_sections',
    'lti_section_links','chatbot_sessions'
  ];
  course_tables text[] := ARRAY['course_materials','lessons','interactives'];
BEGIN
  FOREACH t IN ARRAY section_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='offering_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='section_id') THEN
      EXECUTE format(
        'UPDATE %I x SET offering_id = s.offering_id FROM sections s WHERE x.section_id = s.id AND x.offering_id IS NULL', t);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY course_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='offering_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='course_id') THEN
      EXECUTE format(
        'UPDATE %I x SET offering_id = sol_default_offering_for_course(x.course_id) WHERE x.offering_id IS NULL', t);
    END IF;
  END LOOP;
END
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_fill_offering_from_section() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.offering_id IS NULL AND NEW.section_id IS NOT NULL THEN
    SELECT s.offering_id INTO NEW.offering_id FROM sections s WHERE s.id = NEW.section_id;
  END IF;
  RETURN NEW;
END
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_fill_offering_from_course() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.offering_id IS NULL AND NEW.course_id IS NOT NULL THEN
    NEW.offering_id := sol_default_offering_for_course(NEW.course_id);
  END IF;
  RETURN NEW;
END
$$;

--> statement-breakpoint
DO $$
DECLARE
  t text;
  section_tables text[] := ARRAY[
    'professor_sections','student_sections','quiz_sections','attempts',
    'chatbot_sections','lesson_sections','interactive_sections','book_sections',
    'lti_section_links','chatbot_sessions'
  ];
  course_tables text[] := ARRAY['sections','course_materials','lessons','interactives'];
BEGIN
  FOREACH t IN ARRAY section_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_fill_offering', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION sol_fill_offering_from_section()',
      t || '_fill_offering', t);
  END LOOP;
  FOREACH t IN ARRAY course_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_fill_offering', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION sol_fill_offering_from_course()',
      t || '_fill_offering', t);
  END LOOP;
END
$$;

--> statement-breakpoint
DO $$
DECLARE
  t text;
  nulls bigint;
  all_tables text[] := ARRAY[
    'sections','professor_sections','student_sections','quiz_sections','attempts',
    'chatbot_sections','lesson_sections','interactive_sections','book_sections',
    'lti_section_links','chatbot_sessions','course_materials','lessons','interactives'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='offering_id') THEN
      EXECUTE format('SELECT count(*) FROM %I WHERE offering_id IS NULL', t) INTO nulls;
      IF nulls = 0 THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN offering_id SET NOT NULL', t);
      ELSE
        RAISE WARNING '0045: %.offering_id still has % NULL rows; left nullable', t, nulls;
      END IF;
    END IF;
  END LOOP;
END
$$;
