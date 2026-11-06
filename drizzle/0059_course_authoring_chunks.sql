-- Authoring materials context under FORCE RLS (no app.tenant_id required).
-- Vector retrieve still uses withTenant; this DEFINER path is the reliable
-- fallback when the pool/GUC path returns empty.

CREATE OR REPLACE FUNCTION sol_course_authoring_chunks(
  p_course_id uuid,
  p_limit integer DEFAULT 24,
  p_focus_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  material_id uuid,
  content text,
  title text,
  origin text,
  version_id uuid
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH focus AS (
    SELECT DISTINCT x AS id
    FROM unnest(COALESCE(p_focus_ids, ARRAY[]::uuid[])) AS x
  ),
  expanded AS (
    SELECT id FROM focus
    UNION
    SELECT kd.id
    FROM knowledge_documents kd
    WHERE kd.deleted_at IS NULL
      AND kd.legacy_material_id IN (SELECT id FROM focus)
    UNION
    SELECT kd.legacy_material_id
    FROM knowledge_documents kd
    WHERE kd.deleted_at IS NULL
      AND kd.legacy_material_id IS NOT NULL
      AND kd.id IN (SELECT id FROM focus)
  ),
  use_focus AS (
    SELECT EXISTS (SELECT 1 FROM focus) AS active
  )
  SELECT
    kc.id,
    kc.document_id AS material_id,
    left(kc.content, 4000) AS content,
    kd.title,
    'shared'::text AS origin,
    kc.version_id
  FROM knowledge_chunks kc
  INNER JOIN course_knowledge_links ckl
    ON ckl.document_id = kc.document_id
   AND ckl.pinned_version_id = kc.version_id
  INNER JOIN knowledge_documents kd
    ON kd.id = kc.document_id
   AND kd.deleted_at IS NULL
  WHERE ckl.course_id = p_course_id
    AND kc.deleted_at IS NULL
    AND kc.superseded_at IS NULL
    AND kc.content IS NOT NULL
    AND (
      NOT (SELECT active FROM use_focus)
      OR kc.document_id IN (SELECT id FROM expanded)
    )
  ORDER BY kd.title ASC, kc.id ASC
  LIMIT GREATEST(COALESCE(p_limit, 24), 1);
$$;

REVOKE ALL ON FUNCTION sol_course_authoring_chunks(uuid, integer, uuid[]) FROM PUBLIC;

CREATE OR REPLACE FUNCTION sol_outline_by_id(p_outline_id uuid)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  tenant_id uuid,
  created_by_user_id uuid,
  title text,
  status text,
  brief text,
  has_prior_corpus boolean,
  bodies_built boolean,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    o.id,
    o.course_id,
    o.tenant_id,
    o.created_by_user_id,
    o.title,
    o.status::text,
    o.brief,
    o.has_prior_corpus,
    o.bodies_built,
    o.deleted_at,
    o.created_at,
    o.updated_at
  FROM course_outlines o
  WHERE o.id = p_outline_id
    AND o.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION sol_outline_by_id(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION sol_outline_item_by_id(p_item_id uuid)
RETURNS TABLE (
  id uuid,
  module_id uuid,
  outline_id uuid,
  course_id uuid,
  tenant_id uuid,
  type text,
  title text,
  status text,
  deleted_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    i.id,
    i.module_id,
    m.outline_id,
    o.course_id,
    COALESCE(i.tenant_id, m.tenant_id, o.tenant_id) AS tenant_id,
    i.type::text,
    i.title,
    i.status::text,
    i.deleted_at
  FROM outline_items i
  JOIN outline_modules m ON m.id = i.module_id
  JOIN course_outlines o ON o.id = m.outline_id
  WHERE i.id = p_item_id
    AND i.deleted_at IS NULL
    AND m.deleted_at IS NULL
    AND o.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION sol_outline_item_by_id(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION sol_authoring_revision_by_id(p_revision_id uuid)
RETURNS TABLE (
  id uuid,
  outline_id uuid,
  label text,
  snapshot jsonb,
  tenant_id uuid,
  created_by_user_id uuid,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    r.id,
    r.outline_id,
    r.label,
    r.snapshot,
    COALESCE(r.tenant_id, o.tenant_id) AS tenant_id,
    r.created_by_user_id,
    r.created_at
  FROM authoring_revisions r
  JOIN course_outlines o ON o.id = r.outline_id
  WHERE r.id = p_revision_id
    AND o.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION sol_authoring_revision_by_id(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION sol_outlines_for_course(
  p_course_id uuid,
  p_include_archived boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  tenant_id uuid,
  title text,
  status text,
  brief text,
  has_prior_corpus boolean,
  bodies_built boolean,
  preview text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    o.id,
    o.course_id,
    o.tenant_id,
    o.title,
    o.status::text,
    o.brief,
    o.has_prior_corpus,
    o.bodies_built,
    COALESCE(
      (
        SELECT left(m.content, 120)
        FROM authoring_messages m
        WHERE m.outline_id = o.id AND m.role = 'user'
        ORDER BY m.created_at ASC
        LIMIT 1
      ),
      NULLIF(left(trim(COALESCE(o.brief, '')), 120), '')
    ) AS preview,
    o.created_at,
    o.updated_at
  FROM course_outlines o
  WHERE o.course_id = p_course_id
    AND o.deleted_at IS NULL
    AND (p_include_archived OR o.status <> 'ARCHIVED')
  ORDER BY o.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION sol_outlines_for_course(uuid, boolean) FROM PUBLIC;

CREATE OR REPLACE FUNCTION sol_authoring_messages_for_outline(
  p_outline_id uuid,
  p_limit integer DEFAULT 40
)
RETURNS TABLE (
  id uuid,
  outline_id uuid,
  role text,
  content text,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT m.id, m.outline_id, m.role::text, m.content, m.created_at
  FROM authoring_messages m
  WHERE m.outline_id = p_outline_id
  ORDER BY m.created_at ASC
  LIMIT GREATEST(COALESCE(p_limit, 40), 1);
$$;

REVOKE ALL ON FUNCTION sol_authoring_messages_for_outline(uuid, integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION sol_outline_tree_by_id(p_outline_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', o.id,
    'courseId', o.course_id,
    'tenantId', o.tenant_id,
    'title', o.title,
    'status', o.status,
    'brief', o.brief,
    'hasPriorCorpus', o.has_prior_corpus,
    'bodiesBuilt', o.bodies_built,
    'createdAt', o.created_at,
    'updatedAt', o.updated_at,
    'modules', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'summary', m.summary,
          'position', m.position,
          'items', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'moduleId', i.module_id,
                'type', i.type,
                'title', i.title,
                'status', i.status,
                'body', i.body,
                'sourceMaterialIds', i.source_material_ids,
                'variantOfItemId', i.variant_of_item_id,
                'faithfulBody', i.faithful_body,
                'publishedQuizId', i.published_quiz_id,
                'publishedChatbotId', i.published_chatbot_id,
                'publishedLessonId', i.published_lesson_id,
                'publishedInteractiveId', i.published_interactive_id,
                'position', i.position,
                'reviewFlags', i.review_flags,
                'reviewStatus', i.review_status
              ) ORDER BY i.position
            )
            FROM outline_items i
            WHERE i.module_id = m.id AND i.deleted_at IS NULL
          ), '[]'::jsonb)
        ) ORDER BY m.position
      )
      FROM outline_modules m
      WHERE m.outline_id = o.id AND m.deleted_at IS NULL
    ), '[]'::jsonb)
  ) END
  FROM course_outlines o
  WHERE o.id = p_outline_id AND o.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION sol_outline_tree_by_id(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_course_authoring_chunks(uuid, integer, uuid[]) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_outline_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_outline_item_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_authoring_revision_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_outlines_for_course(uuid, boolean) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_authoring_messages_for_outline(uuid, integer) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_outline_tree_by_id(uuid) TO sol_app;
  END IF;
END
$$;
