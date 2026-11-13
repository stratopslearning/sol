-- Faculty book reader + release under FORCE RLS.
-- Bare Drizzle book_chapters reads return 0 rows → "0 chapters".
-- book_sections inserts miss tenant_id/offering_id and fail under RLS → release 500.

CREATE OR REPLACE FUNCTION sol_book_chapters_toc_for_book(p_book_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF p_book_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = p_book_id;
  IF v_tenant IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', bc.id,
          'bookId', bc.book_id,
          'position', bc.position,
          'title', bc.title,
          'slug', bc.slug,
          'partTitle', bc.part_title,
          'parentId', bc.parent_id,
          'level', bc.level
        )
        ORDER BY bc.position ASC
      )
      FROM book_chapters bc
      WHERE bc.book_id = p_book_id AND bc.deleted_at IS NULL
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_book_chapter_for_reader(p_chapter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row book_chapters%ROWTYPE;
BEGIN
  IF p_chapter_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(bc.tenant_id, hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM book_chapters bc
  JOIN hosted_books hb ON hb.id = bc.book_id
  JOIN courses c ON c.id = hb.course_id
  WHERE bc.id = p_chapter_id;

  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  SELECT * INTO v_row
  FROM book_chapters
  WHERE id = p_chapter_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
-- Replace section assignments for a book. Sets tenant_id + offering_id from sections.
CREATE OR REPLACE FUNCTION sol_assign_book_sections(p_payload jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book uuid := (p_payload->>'bookId')::uuid;
  v_assigned_by uuid := (p_payload->>'assignedBy')::uuid;
  v_tenant uuid;
  v_section uuid;
  v_offering uuid;
  v_sec_tenant uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_book IS NULL OR v_assigned_by IS NULL THEN
    RAISE EXCEPTION 'bookId and assignedBy required';
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = v_book AND hb.deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  DELETE FROM book_sections WHERE book_id = v_book;

  FOR v_section IN
    SELECT (jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb)))::uuid
  LOOP
    SELECT s.offering_id, s.tenant_id
    INTO v_offering, v_sec_tenant
    FROM sections s
    WHERE s.id = v_section AND s.deleted_at IS NULL;
    IF v_offering IS NULL THEN
      RAISE EXCEPTION 'Section % missing offering_id', v_section;
    END IF;

    INSERT INTO book_sections (
      book_id, section_id, assigned_by, tenant_id, offering_id
    ) VALUES (
      v_book,
      v_section,
      v_assigned_by,
      COALESCE(v_sec_tenant, v_tenant),
      v_offering
    );
    v_ids := array_append(v_ids, v_section);
  END LOOP;

  RETURN v_ids;
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_book_chapters_toc_for_book(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_book_chapter_for_reader(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_assign_book_sections(jsonb) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_book_chapters_toc_for_book(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_book_chapter_for_reader(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_assign_book_sections(jsonb) TO sol_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner')
     AND pg_has_role(current_user, 'neondb_owner', 'member') THEN
    ALTER FUNCTION sol_book_chapters_toc_for_book(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_book_chapter_for_reader(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_assign_book_sections(jsonb) OWNER TO neondb_owner;
  END IF;
END
$$;
