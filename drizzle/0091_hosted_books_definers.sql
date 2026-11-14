-- Hosted book writes under FORCE RLS. Bare Drizzle inserts omit tenant_id and
-- never pin app.tenant_id, so WITH CHECK (tenant_id = sol_tenant_guc()) fails
-- with HTTP 500 (seen on /api/professor/books/direct-upload).

CREATE OR REPLACE FUNCTION sol_create_hosted_book(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_user uuid := (p_payload->>'createdByUserId')::uuid;
  v_title text := COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Imported book');
  v_kind text := p_payload->>'sourceKind';
  v_url text := NULLIF(p_payload->>'sourceUrl', '');
  v_s3 text := NULLIF(p_payload->>'s3Key', '');
  v_tenant uuid;
  v_row hosted_books%ROWTYPE;
BEGIN
  IF v_course IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'courseId and createdByUserId required';
  END IF;
  IF v_kind IS NULL OR v_kind NOT IN ('WEBBOOK_URL', 'EPUB', 'PRESSBOOKS_XML', 'PDF') THEN
    RAISE EXCEPTION 'invalid sourceKind';
  END IF;

  -- Resolve via bypass DEFINER so this works even when the function owner
  -- does not have BYPASSRLS (sol_migrator) and app.tenant_id is unset.
  SELECT COALESCE(c.tenant_id, c.workspace_id) INTO v_tenant
  FROM sol_course_by_id(v_course) c;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  INSERT INTO hosted_books (
    course_id,
    tenant_id,
    created_by_user_id,
    title,
    source_kind,
    source_url,
    s3_key,
    status
  ) VALUES (
    v_course,
    v_tenant,
    v_user,
    left(v_title, 500),
    v_kind,
    v_url,
    v_s3,
    'PENDING'
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_update_hosted_book(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := (p_payload->>'bookId')::uuid;
  v_tenant uuid;
  v_row hosted_books%ROWTYPE;
BEGIN
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'bookId required';
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = v_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Book tenant could not be resolved';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE hosted_books
  SET
    tenant_id = COALESCE(tenant_id, v_tenant),
    s3_key = CASE
      WHEN p_payload ? 's3Key' THEN NULLIF(p_payload->>'s3Key', '')
      ELSE s3_key
    END,
    title = CASE
      WHEN p_payload ? 'title' THEN left(COALESCE(NULLIF(trim(p_payload->>'title'), ''), title), 500)
      ELSE title
    END,
    status = CASE
      WHEN p_payload ? 'status' THEN p_payload->>'status'
      ELSE status
    END,
    error_message = CASE
      WHEN p_payload ? 'errorMessage' THEN NULLIF(p_payload->>'errorMessage', '')
      ELSE error_message
    END,
    is_released = CASE
      WHEN p_payload ? 'isReleased' THEN (p_payload->>'isReleased')::boolean
      ELSE is_released
    END,
    deleted_at = CASE
      WHEN p_payload ? 'deletedAt' THEN NULLIF(p_payload->>'deletedAt', '')::timestamptz
      ELSE deleted_at
    END,
    updated_at = now()
  WHERE id = v_id
    AND (
      NULLIF(p_payload->>'onlyIfStatus', '') IS NULL
      OR status = p_payload->>'onlyIfStatus'
    )
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_hosted_book_by_id(p_book_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_row hosted_books%ROWTYPE;
BEGIN
  IF p_book_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = p_book_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  SELECT * INTO v_row FROM hosted_books WHERE id = p_book_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_hosted_books_for_course(p_course_id uuid)
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
  FROM courses c
  WHERE c.id = p_course_id AND c.deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(hb) ORDER BY hb.created_at DESC)
      FROM hosted_books hb
      WHERE hb.course_id = p_course_id AND hb.deleted_at IS NULL
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_book_chapters_toc_for_course(p_course_id uuid)
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
  FROM courses c
  WHERE c.id = p_course_id AND c.deleted_at IS NULL;
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
          'partTitle', bc.part_title,
          'parentId', bc.parent_id,
          'level', bc.level
        )
        ORDER BY bc.position ASC
      )
      FROM book_chapters bc
      WHERE bc.course_id = p_course_id AND bc.deleted_at IS NULL
    ),
    '[]'::jsonb
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_soft_delete_book_chapters(p_book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF p_book_id IS NULL THEN
    RAISE EXCEPTION 'bookId required';
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = p_book_id;
  IF NOT FOUND OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  UPDATE book_chapters
  SET deleted_at = now(), updated_at = now()
  WHERE book_id = p_book_id AND deleted_at IS NULL;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_insert_book_chapter(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book uuid := (p_payload->>'bookId')::uuid;
  v_course uuid := (p_payload->>'courseId')::uuid;
  v_tenant uuid;
  v_id uuid;
BEGIN
  IF v_book IS NULL OR v_course IS NULL THEN
    RAISE EXCEPTION 'bookId and courseId required';
  END IF;

  SELECT COALESCE(hb.tenant_id, c.tenant_id, c.workspace_id)
  INTO v_tenant
  FROM hosted_books hb
  JOIN courses c ON c.id = hb.course_id
  WHERE hb.id = v_book;
  IF NOT FOUND OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  INSERT INTO book_chapters (
    book_id,
    course_id,
    tenant_id,
    parent_id,
    level,
    position,
    title,
    slug,
    part_title,
    markdown,
    html,
    source_url,
    material_id
  ) VALUES (
    v_book,
    v_course,
    v_tenant,
    NULLIF(p_payload->>'parentId', '')::uuid,
    COALESCE((p_payload->>'level')::int, 1),
    COALESCE((p_payload->>'position')::int, 0),
    left(COALESCE(NULLIF(trim(p_payload->>'title'), ''), 'Chapter'), 300),
    left(COALESCE(NULLIF(trim(p_payload->>'slug'), ''), 'chapter'), 120),
    NULLIF(left(trim(p_payload->>'partTitle'), 300), ''),
    COALESCE(p_payload->>'markdown', ''),
    NULLIF(p_payload->>'html', ''),
    NULLIF(p_payload->>'sourceUrl', ''),
    NULLIF(p_payload->>'materialId', '')::uuid
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_create_hosted_book(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_update_hosted_book(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_hosted_book_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_hosted_books_for_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_book_chapters_toc_for_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_soft_delete_book_chapters(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_insert_book_chapter(jsonb) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_create_hosted_book(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_update_hosted_book(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_hosted_book_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_hosted_books_for_course(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_book_chapters_toc_for_course(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_soft_delete_book_chapters(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_insert_book_chapter(jsonb) TO sol_app;
  END IF;

  -- Prefer BYPASSRLS owner when the migrator can SET ROLE; otherwise keep
  -- sol_migrator ownership and rely on set_config('app.tenant_id') in bodies.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner')
     AND pg_has_role(current_user, 'neondb_owner', 'member') THEN
    ALTER FUNCTION sol_create_hosted_book(jsonb) OWNER TO neondb_owner;
    ALTER FUNCTION sol_update_hosted_book(jsonb) OWNER TO neondb_owner;
    ALTER FUNCTION sol_hosted_book_by_id(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_hosted_books_for_course(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_book_chapters_toc_for_course(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_soft_delete_book_chapters(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_insert_book_chapter(jsonb) OWNER TO neondb_owner;
  END IF;
END
$$;
