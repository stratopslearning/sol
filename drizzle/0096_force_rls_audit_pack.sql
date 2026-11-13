-- FORCE RLS audit pack: books/student reader, section assigns, materials jobs/cron.
-- Bare Drizzle on FORCE RLS tables returns 0 rows or fails WITH CHECK when
-- app.tenant_id is unset (Neon pool/HTTP does not keep session GUCs).

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_soft_delete_book_chapters_by_ids(
  p_book_id uuid,
  p_chapter_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_count integer;
BEGIN
  IF p_book_id IS NULL OR p_chapter_ids IS NULL OR cardinality(p_chapter_ids) = 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = p_book_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Book not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE book_chapters
  SET deleted_at = now(), updated_at = now()
  WHERE book_id = p_book_id
    AND id = ANY(p_chapter_ids)
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_book_material_ids_for_books(p_book_ids uuid[])
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF p_book_ids IS NULL OR cardinality(p_book_ids) = 0 THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  SELECT COALESCE(array_agg(DISTINCT bc.material_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM book_chapters bc
  WHERE bc.book_id = ANY(p_book_ids)
    AND bc.deleted_at IS NULL
    AND bc.material_id IS NOT NULL;
  RETURN v_ids;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_book_chapters_detail_for_book(p_book_id uuid)
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
          'level', bc.level,
          'sourceUrl', bc.source_url,
          'materialId', bc.material_id,
          'markdownLength', char_length(bc.markdown)
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
CREATE OR REPLACE FUNCTION sol_book_section_ids_for_book(p_book_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_ids uuid[];
BEGIN
  IF p_book_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = p_book_id;
  IF v_tenant IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT COALESCE(array_agg(bs.section_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM book_sections bs
  WHERE bs.book_id = p_book_id;
  RETURN v_ids;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_active_section_ids_for_student(p_student_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF p_student_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  SELECT COALESCE(array_agg(ss.section_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM student_sections ss
  WHERE ss.student_id = p_student_id AND ss.status = 'ACTIVE';
  RETURN v_ids;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_student_book_assignments(p_section_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_section_ids IS NULL OR cardinality(p_section_ids) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'bookId', hb.id,
          'title', hb.title,
          'courseId', hb.course_id,
          'courseTitle', c.title,
          'sectionId', bs.section_id,
          'sectionName', s.name,
          'status', hb.status,
          'isReleased', hb.is_released
        )
        ORDER BY hb.title ASC
      )
      FROM book_sections bs
      JOIN hosted_books hb ON hb.id = bs.book_id
      JOIN sections s ON s.id = bs.section_id
      JOIN courses c ON c.id = hb.course_id
      WHERE bs.section_id = ANY(p_section_ids)
        AND hb.deleted_at IS NULL
        AND hb.is_released = true
        AND hb.status = 'READY'
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_interactive_section_ids(p_interactive_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_ids uuid[];
BEGIN
  IF p_interactive_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  SELECT tenant_id INTO v_tenant
  FROM interactives
  WHERE id = p_interactive_id AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);
  SELECT COALESCE(array_agg(section_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM interactive_sections
  WHERE interactive_id = p_interactive_id;
  RETURN v_ids;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_interactive_sections(p_payload jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interactive uuid := (p_payload->>'interactiveId')::uuid;
  v_assigned_by uuid := (p_payload->>'assignedBy')::uuid;
  v_tenant uuid;
  v_ids uuid[];
  v_bad int;
BEGIN
  SELECT tenant_id INTO v_tenant
  FROM interactives
  WHERE id = v_interactive AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Interactive not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  SELECT count(*)::int INTO v_bad
  FROM unnest(
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_payload->'sectionIds', '[]'::jsonb)
        )::uuid
      ),
      ARRAY[]::uuid[]
    )
  ) AS sid
  LEFT JOIN sections s ON s.id = sid
  WHERE s.id IS NULL
     OR COALESCE(s.tenant_id, s.workspace_id) IS DISTINCT FROM v_tenant;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Section tenant mismatch for interactive assignment';
  END IF;

  DELETE FROM interactive_sections WHERE interactive_id = v_interactive;

  INSERT INTO interactive_sections (interactive_id, section_id, assigned_by, tenant_id)
  SELECT v_interactive, sid, v_assigned_by, v_tenant
  FROM unnest(
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_payload->'sectionIds', '[]'::jsonb)
        )::uuid
      ),
      ARRAY[]::uuid[]
    )
  ) AS sid;

  SELECT array_agg(section_id) INTO v_ids
  FROM interactive_sections WHERE interactive_id = v_interactive;
  RETURN COALESCE(v_ids, ARRAY[]::uuid[]);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_assign_lesson_sections(p_payload jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson uuid := (p_payload->>'lessonId')::uuid;
  v_assigned_by uuid := (p_payload->>'assignedBy')::uuid;
  v_tenant uuid;
  v_section uuid;
  v_sec_tenant uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT tenant_id INTO v_tenant
  FROM lessons
  WHERE id = v_lesson AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOR v_section IN
    SELECT (jsonb_array_elements_text(COALESCE(p_payload->'sectionIds', '[]'::jsonb)))::uuid
  LOOP
    SELECT COALESCE(s.tenant_id, s.workspace_id) INTO v_sec_tenant
    FROM sections s WHERE s.id = v_section;
    IF v_sec_tenant IS NULL OR v_sec_tenant IS DISTINCT FROM v_tenant THEN
      RAISE EXCEPTION 'Section tenant mismatch for lesson assignment';
    END IF;
    INSERT INTO lesson_sections (lesson_id, section_id, assigned_by, tenant_id)
    VALUES (v_lesson, v_section, v_assigned_by, v_tenant)
    ON CONFLICT DO NOTHING;
    v_ids := array_append(v_ids, v_section);
  END LOOP;

  RETURN v_ids;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_course_material_authoring_corpus(
  p_material_id uuid,
  p_corpus text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row course_materials%ROWTYPE;
BEGIN
  IF p_material_id IS NULL OR p_corpus IS NULL THEN
    RAISE EXCEPTION 'materialId and corpus required';
  END IF;
  IF p_corpus NOT IN ('prior_course', 'this_term') THEN
    RAISE EXCEPTION 'Invalid authoring corpus';
  END IF;

  SELECT COALESCE(m.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM course_materials m
  JOIN courses c ON c.id = m.course_id
  WHERE m.id = p_material_id;
  IF v_tenant IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE course_materials
  SET authoring_corpus = p_corpus, updated_at = now()
  WHERE id = p_material_id AND deleted_at IS NULL
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_claim_course_material(p_material_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row course_materials%ROWTYPE;
BEGIN
  IF p_material_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(m.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM course_materials m
  JOIN courses c ON c.id = m.course_id
  WHERE m.id = p_material_id;
  IF v_tenant IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE course_materials
  SET status = 'PROCESSING', error_message = NULL, updated_at = now()
  WHERE id = p_material_id
    AND deleted_at IS NULL
    AND status = 'PENDING'
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_delete_course_material_chunks(p_material_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_count integer;
BEGIN
  IF p_material_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(m.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM course_materials m
  JOIN courses c ON c.id = m.course_id
  WHERE m.id = p_material_id;
  IF v_tenant IS NULL THEN
    RETURN 0;
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  DELETE FROM course_material_chunks WHERE material_id = p_material_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_pending_hosted_books(
  p_limit integer,
  p_stale_before timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(x)::jsonb)
      FROM (
        SELECT id, status, course_id AS "courseId", updated_at AS "updatedAt"
        FROM hosted_books
        WHERE deleted_at IS NULL
          AND (
            status = 'PENDING'
            OR (status = 'PROCESSING' AND updated_at < p_stale_before)
          )
        ORDER BY created_at ASC
        LIMIT GREATEST(COALESCE(p_limit, 3), 1)
      ) x
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_list_pending_course_materials(
  p_limit integer,
  p_stale_before timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(x)::jsonb)
      FROM (
        SELECT id, status, course_id AS "courseId", updated_at AS "updatedAt"
        FROM course_materials
        WHERE deleted_at IS NULL
          AND (
            status = 'PENDING'
            OR (status = 'PROCESSING' AND updated_at < p_stale_before)
          )
        ORDER BY created_at ASC
        LIMIT GREATEST(COALESCE(p_limit, 10), 1)
      ) x
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_book_chapter_material_links_for_course(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF p_course_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT COALESCE(c.tenant_id, c.workspace_id) INTO v_tenant
  FROM courses c WHERE c.id = p_course_id;
  IF v_tenant IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'materialId', bc.material_id,
          'deletedAt', bc.deleted_at
        )
      )
      FROM book_chapters bc
      WHERE bc.course_id = p_course_id
        AND bc.material_id IS NOT NULL
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_soft_delete_book_chapters_by_ids(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_book_material_ids_for_books(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_book_chapters_detail_for_book(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_book_section_ids_for_book(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_active_section_ids_for_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_student_book_assignments(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_interactive_section_ids(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_interactive_sections(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_assign_lesson_sections(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_course_material_authoring_corpus(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_claim_course_material(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_delete_course_material_chunks(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_list_pending_hosted_books(integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_list_pending_course_materials(integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_book_chapter_material_links_for_course(uuid) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_soft_delete_book_chapters_by_ids(uuid, uuid[]) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_book_material_ids_for_books(uuid[]) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_book_chapters_detail_for_book(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_book_section_ids_for_book(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_active_section_ids_for_student(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_student_book_assignments(uuid[]) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_interactive_section_ids(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_interactive_sections(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_assign_lesson_sections(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_course_material_authoring_corpus(uuid, text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_claim_course_material(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_delete_course_material_chunks(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_list_pending_hosted_books(integer, timestamptz) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_list_pending_course_materials(integer, timestamptz) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_book_chapter_material_links_for_course(uuid) TO sol_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner')
     AND pg_has_role(current_user, 'neondb_owner', 'member') THEN
    ALTER FUNCTION sol_soft_delete_book_chapters_by_ids(uuid, uuid[]) OWNER TO neondb_owner;
    ALTER FUNCTION sol_book_material_ids_for_books(uuid[]) OWNER TO neondb_owner;
    ALTER FUNCTION sol_book_chapters_detail_for_book(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_book_section_ids_for_book(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_active_section_ids_for_student(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_student_book_assignments(uuid[]) OWNER TO neondb_owner;
    ALTER FUNCTION sol_interactive_section_ids(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_set_interactive_sections(jsonb) OWNER TO neondb_owner;
    ALTER FUNCTION sol_assign_lesson_sections(jsonb) OWNER TO neondb_owner;
    ALTER FUNCTION sol_set_course_material_authoring_corpus(uuid, text) OWNER TO neondb_owner;
    ALTER FUNCTION sol_claim_course_material(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_delete_course_material_chunks(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_list_pending_hosted_books(integer, timestamptz) OWNER TO neondb_owner;
    ALTER FUNCTION sol_list_pending_course_materials(integer, timestamptz) OWNER TO neondb_owner;
    ALTER FUNCTION sol_book_chapter_material_links_for_course(uuid) OWNER TO neondb_owner;
  END IF;
END
$$;
