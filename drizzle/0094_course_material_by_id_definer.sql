-- Course material reads/deletes under FORCE RLS need DEFINER helpers.
-- Bare Drizzle findMany returns 0 rows → "Material not found" on DELETE.

CREATE OR REPLACE FUNCTION sol_course_material_by_id(p_material_id uuid)
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

  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  SELECT * INTO v_row FROM course_materials WHERE id = p_material_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_book_linked_material_ids(p_course_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_ids uuid[];
BEGIN
  SELECT COALESCE(c.tenant_id, c.workspace_id) INTO v_tenant
  FROM courses c WHERE c.id = p_course_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  SELECT COALESCE(array_agg(DISTINCT bc.material_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM book_chapters bc
  WHERE bc.course_id = p_course_id
    AND bc.deleted_at IS NULL
    AND bc.material_id IS NOT NULL;
  RETURN v_ids;
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_course_material_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_book_linked_material_ids(uuid) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_course_material_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_book_linked_material_ids(uuid) TO sol_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner')
     AND pg_has_role(current_user, 'neondb_owner', 'member') THEN
    ALTER FUNCTION sol_course_material_by_id(uuid) OWNER TO neondb_owner;
    ALTER FUNCTION sol_book_linked_material_ids(uuid) OWNER TO neondb_owner;
  END IF;
END
$$;
