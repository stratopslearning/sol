-- Wave 2: knowledge process / connectors / clone under FORCE RLS.

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_knowledge_version_by_id(p_version_id uuid)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  s3_key text,
  checksum text,
  mime_type text,
  byte_size integer,
  version integer,
  ocr_used boolean,
  char_count integer,
  tenant_id uuid
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT v.id, v.document_id, v.s3_key, v.checksum, v.mime_type, v.byte_size,
         v.version, v.ocr_used, v.char_count, v.tenant_id
  FROM knowledge_document_versions v
  WHERE v.id = p_version_id;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_claim_knowledge_document(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row knowledge_documents%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM knowledge_documents WHERE id = p_document_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_row.tenant_id IS NOT NULL OR v_row.workspace_id IS NOT NULL THEN
    PERFORM set_config(
      'app.tenant_id',
      COALESCE(v_row.tenant_id, v_row.workspace_id)::text,
      true
    );
  END IF;

  UPDATE knowledge_documents
  SET status = 'PROCESSING', error_message = NULL, updated_at = now()
  WHERE id = p_document_id
    AND deleted_at IS NULL
    AND status = 'PENDING'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'workspaceId', v_row.workspace_id,
    'tenantId', v_row.tenant_id,
    'currentVersionId', v_row.current_version_id,
    'sourceKind', v_row.source_kind,
    'externalUrl', v_row.external_url,
    'mimeType', v_row.mime_type,
    'legacyMaterialId', v_row.legacy_material_id,
    'status', v_row.status
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_knowledge_document_status(
  p_document_id uuid,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
  FROM knowledge_documents WHERE id = p_document_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE knowledge_documents
  SET status = p_status,
      error_message = NULLIF(p_error, ''),
      updated_at = now()
  WHERE id = p_document_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_set_course_material_status(
  p_material_id uuid,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(tenant_id, (
    SELECT COALESCE(c.tenant_id, c.workspace_id) FROM courses c WHERE c.id = m.course_id
  )) INTO v_tenant
  FROM course_materials m WHERE m.id = p_material_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE course_materials
  SET status = p_status,
      error_message = NULLIF(p_error, ''),
      updated_at = now()
  WHERE id = p_material_id;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_supersede_knowledge_chunks(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
  FROM knowledge_documents WHERE id = p_document_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE knowledge_chunks
  SET superseded_at = now()
  WHERE document_id = p_document_id
    AND superseded_at IS NULL
    AND deleted_at IS NULL;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_insert_knowledge_chunks(p_payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document uuid := (p_payload->>'documentId')::uuid;
  v_version uuid := (p_payload->>'versionId')::uuid;
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_tenant uuid := COALESCE(
    NULLIF(p_payload->>'tenantId', '')::uuid,
    v_workspace
  );
  v_chunk jsonb;
  v_count int := 0;
  v_embedding text;
BEGIN
  IF v_document IS NULL OR v_version IS NULL OR v_workspace IS NULL THEN
    RAISE EXCEPTION 'documentId, versionId, workspaceId required';
  END IF;
  PERFORM set_config('app.tenant_id', v_tenant::text, true);

  FOR v_chunk IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'chunks', '[]'::jsonb))
  LOOP
    v_embedding := v_chunk->>'embedding';
    INSERT INTO knowledge_chunks (
      document_id, version_id, workspace_id, tenant_id,
      chunk_index, content, token_count, embedding
    ) VALUES (
      v_document,
      v_version,
      v_workspace,
      v_tenant,
      COALESCE((v_chunk->>'chunkIndex')::int, (v_chunk->>'index')::int, 0),
      COALESCE(v_chunk->>'content', ''),
      COALESCE((v_chunk->>'tokenCount')::int, 0),
      CASE
        WHEN v_embedding IS NULL OR v_embedding = '' THEN NULL
        ELSE v_embedding::vector
      END
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_update_knowledge_version_meta(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version uuid := (p_payload->>'versionId')::uuid;
  v_tenant uuid;
BEGIN
  SELECT COALESCE(v.tenant_id, d.tenant_id, d.workspace_id)
  INTO v_tenant
  FROM knowledge_document_versions v
  JOIN knowledge_documents d ON d.id = v.document_id
  WHERE v.id = v_version;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;

  UPDATE knowledge_document_versions SET
    ocr_used = COALESCE((p_payload->>'ocrUsed')::boolean, ocr_used),
    char_count = COALESCE((p_payload->>'charCount')::int, char_count),
    checksum = COALESCE(NULLIF(p_payload->>'checksum', ''), checksum)
  WHERE id = v_version;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_reset_knowledge_document_pending(
  p_document_id uuid,
  p_current_version_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
  FROM knowledge_documents WHERE id = p_document_id;
  IF v_tenant IS NOT NULL THEN
    PERFORM set_config('app.tenant_id', v_tenant::text, true);
  END IF;
  UPDATE knowledge_documents SET
    current_version_id = COALESCE(p_current_version_id, current_version_id),
    status = 'PENDING',
    error_message = NULL,
    updated_at = now()
  WHERE id = p_document_id AND deleted_at IS NULL;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_clone_course_knowledge_links(p_payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from uuid := (p_payload->>'fromCourseId')::uuid;
  v_to uuid := (p_payload->>'toCourseId')::uuid;
  v_linked_by uuid := NULLIF(p_payload->>'linkedByUserId', '')::uuid;
  v_to_tenant uuid;
  v_count int := 0;
  v_link course_knowledge_links%ROWTYPE;
BEGIN
  SELECT COALESCE(c.tenant_id, c.workspace_id) INTO v_to_tenant
  FROM courses c WHERE c.id = v_to AND c.deleted_at IS NULL;
  IF v_to_tenant IS NULL THEN
    RAISE EXCEPTION 'Destination course not found';
  END IF;
  PERFORM set_config('app.tenant_id', v_to_tenant::text, true);

  FOR v_link IN
    SELECT * FROM course_knowledge_links WHERE course_id = v_from
  LOOP
    IF v_link.pinned_version_id IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO course_knowledge_links (
      course_id, document_id, linked_by_user_id, authoring_corpus,
      pinned_version_id, tenant_id, update_available_version_id,
      update_noticed_at, created_at, updated_at
    ) VALUES (
      v_to,
      v_link.document_id,
      COALESCE(v_linked_by, v_link.linked_by_user_id),
      v_link.authoring_corpus,
      v_link.pinned_version_id,
      v_to_tenant,
      NULL,
      NULL,
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_soft_delete_mirrored_knowledge_docs(p_material_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mid uuid;
  v_tenant uuid;
  v_count int := 0;
BEGIN
  FOREACH v_mid IN ARRAY p_material_ids
  LOOP
    SELECT COALESCE(tenant_id, workspace_id) INTO v_tenant
    FROM knowledge_documents
    WHERE legacy_material_id = v_mid AND deleted_at IS NULL
    LIMIT 1;
    IF v_tenant IS NOT NULL THEN
      PERFORM set_config('app.tenant_id', v_tenant::text, true);
    END IF;
    UPDATE knowledge_documents
    SET deleted_at = now(), updated_at = now()
    WHERE legacy_material_id = v_mid AND deleted_at IS NULL;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_upsert_knowledge_connector(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid := (p_payload->>'workspaceId')::uuid;
  v_provider text := p_payload->>'provider';
  v_row knowledge_connectors%ROWTYPE;
BEGIN
  IF v_workspace IS NULL OR v_provider IS NULL THEN
    RAISE EXCEPTION 'workspaceId and provider required';
  END IF;
  PERFORM set_config('app.tenant_id', v_workspace::text, true);

  SELECT * INTO v_row
  FROM knowledge_connectors
  WHERE workspace_id = v_workspace
    AND provider = v_provider
    AND deleted_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    UPDATE knowledge_connectors SET
      display_name = COALESCE(NULLIF(p_payload->>'displayName', ''), display_name),
      config = COALESCE(p_payload->'config', config),
      updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO knowledge_connectors (
      workspace_id, tenant_id, provider, display_name, config, status, created_by_user_id
    ) VALUES (
      v_workspace,
      v_workspace,
      v_provider,
      COALESCE(NULLIF(p_payload->>'displayName', ''), v_provider),
      COALESCE(p_payload->'config', '{}'::jsonb),
      'disconnected',
      NULLIF(p_payload->>'createdByUserId', '')::uuid
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'workspaceId', v_row.workspace_id,
    'provider', v_row.provider,
    'displayName', v_row.display_name,
    'status', v_row.status,
    'config', v_row.config,
    'lastSyncAt', v_row.last_sync_at,
    'errorMessage', v_row.error_message,
    'createdAt', v_row.created_at,
    'updatedAt', v_row.updated_at
  );
END;
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sol_update_knowledge_connector(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := (p_payload->>'connectorId')::uuid;
  v_row knowledge_connectors%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM knowledge_connectors WHERE id = v_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connector not found';
  END IF;
  PERFORM set_config(
    'app.tenant_id',
    COALESCE(v_row.tenant_id, v_row.workspace_id)::text,
    true
  );

  UPDATE knowledge_connectors SET
    encrypted_tokens = CASE
      WHEN p_payload ? 'encryptedTokens' THEN NULLIF(p_payload->>'encryptedTokens', '')
      ELSE encrypted_tokens
    END,
    scopes = CASE
      WHEN p_payload ? 'scopes' THEN NULLIF(p_payload->>'scopes', '')
      ELSE scopes
    END,
    status = COALESCE(NULLIF(p_payload->>'status', ''), status),
    error_message = CASE
      WHEN p_payload ? 'errorMessage' THEN NULLIF(p_payload->>'errorMessage', '')
      ELSE error_message
    END,
    config = CASE
      WHEN p_payload ? 'config' THEN COALESCE(p_payload->'config', config)
      ELSE config
    END,
    deleted_at = CASE
      WHEN (p_payload->>'deleted')::boolean IS TRUE THEN now()
      ELSE deleted_at
    END,
    updated_at = now()
  WHERE id = v_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'workspaceId', v_row.workspace_id,
    'provider', v_row.provider,
    'displayName', v_row.display_name,
    'status', v_row.status,
    'config', v_row.config,
    'lastSyncAt', v_row.last_sync_at,
    'errorMessage', v_row.error_message,
    'createdAt', v_row.created_at,
    'updatedAt', v_row.updated_at
  );
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sol_knowledge_version_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_claim_knowledge_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_knowledge_document_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_set_course_material_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_supersede_knowledge_chunks(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_insert_knowledge_chunks(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_update_knowledge_version_meta(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_reset_knowledge_document_pending(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_clone_course_knowledge_links(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_soft_delete_mirrored_knowledge_docs(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_upsert_knowledge_connector(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sol_update_knowledge_connector(jsonb) FROM PUBLIC;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT EXECUTE ON FUNCTION sol_knowledge_version_by_id(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_claim_knowledge_document(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_knowledge_document_status(uuid, text, text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_set_course_material_status(uuid, text, text) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_supersede_knowledge_chunks(uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_insert_knowledge_chunks(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_update_knowledge_version_meta(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_reset_knowledge_document_pending(uuid, uuid) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_clone_course_knowledge_links(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_soft_delete_mirrored_knowledge_docs(uuid[]) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_upsert_knowledge_connector(jsonb) TO sol_app;
    GRANT EXECUTE ON FUNCTION sol_update_knowledge_connector(jsonb) TO sol_app;
  END IF;
END
$$;
