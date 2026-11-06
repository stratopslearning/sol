-- Replace quiz→section links under FORCE RLS (assignments / section assign UI).

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_quiz_sections(p_payload jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz uuid := (p_payload->>'quizId')::uuid;
  v_assigned_by uuid := (p_payload->>'assignedBy')::uuid;
  v_tenant uuid;
  v_ids uuid[];
BEGIN
  SELECT tenant_id INTO v_tenant FROM quizzes WHERE id = v_quiz AND deleted_at IS NULL;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  DELETE FROM quiz_sections WHERE quiz_id = v_quiz;

  INSERT INTO quiz_sections (quiz_id, section_id, assigned_by, tenant_id)
  SELECT v_quiz, sid, v_assigned_by, v_tenant
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
  FROM quiz_sections WHERE quiz_id = v_quiz;
  RETURN COALESCE(v_ids, ARRAY[]::uuid[]);
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_set_quiz_sections(jsonb) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_set_quiz_sections(jsonb) TO sol_app;
  END IF;
END
$$;
