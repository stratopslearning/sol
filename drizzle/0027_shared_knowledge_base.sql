-- Shared workspace Knowledge Base: versioned docs, course links, connectors.

CREATE TABLE IF NOT EXISTS "knowledge_connectors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "provider" text NOT NULL,
  "status" text DEFAULT 'disconnected' NOT NULL,
  "display_name" text,
  "encrypted_tokens" text,
  "scopes" text,
  "config" jsonb DEFAULT '{}'::jsonb,
  "last_sync_at" timestamp,
  "error_message" text,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "knowledge_connectors_workspace_idx"
  ON "knowledge_connectors" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_connectors_workspace_provider_unique"
  ON "knowledge_connectors" ("workspace_id", "provider")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "knowledge_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "source_kind" text NOT NULL,
  "mime_type" text,
  "byte_size" integer,
  "external_url" text,
  "connector_id" uuid REFERENCES "knowledge_connectors"("id") ON DELETE set null,
  "external_id" text,
  "external_path" text,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "error_message" text,
  "current_version_id" uuid,
  "legacy_material_id" uuid REFERENCES "course_materials"("id") ON DELETE set null,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "knowledge_documents_workspace_idx"
  ON "knowledge_documents" ("workspace_id");
CREATE INDEX IF NOT EXISTS "knowledge_documents_workspace_status_idx"
  ON "knowledge_documents" ("workspace_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_documents_connector_external_unique"
  ON "knowledge_documents" ("workspace_id", "connector_id", "external_id")
  WHERE "connector_id" IS NOT NULL AND "external_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_documents_legacy_material_unique"
  ON "knowledge_documents" ("legacy_material_id")
  WHERE "legacy_material_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "knowledge_document_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "knowledge_documents"("id") ON DELETE cascade,
  "version" integer NOT NULL,
  "s3_key" text,
  "checksum" text,
  "byte_size" integer,
  "mime_type" text,
  "ocr_used" boolean DEFAULT false NOT NULL,
  "char_count" integer,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_document_versions_doc_version_unique"
  ON "knowledge_document_versions" ("document_id", "version");
CREATE INDEX IF NOT EXISTS "knowledge_document_versions_document_idx"
  ON "knowledge_document_versions" ("document_id");

-- Optional pointer integrity (nullable; set after version insert).
DO $$ BEGIN
  ALTER TABLE "knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_current_version_fk"
    FOREIGN KEY ("current_version_id")
    REFERENCES "knowledge_document_versions"("id")
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "knowledge_documents"("id") ON DELETE cascade,
  "version_id" uuid NOT NULL REFERENCES "knowledge_document_versions"("id") ON DELETE cascade,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "token_count" integer,
  "embedding" vector(1536),
  "superseded_at" timestamp,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "knowledge_chunks_document_idx"
  ON "knowledge_chunks" ("document_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunks_version_idx"
  ON "knowledge_chunks" ("version_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunks_workspace_idx"
  ON "knowledge_chunks" ("workspace_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_hnsw_idx"
  ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "deleted_at" IS NULL AND "superseded_at" IS NULL AND "embedding" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "course_knowledge_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE cascade,
  "document_id" uuid NOT NULL REFERENCES "knowledge_documents"("id") ON DELETE cascade,
  "linked_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_knowledge_links_course_document_unique"
  ON "course_knowledge_links" ("course_id", "document_id");
CREATE INDEX IF NOT EXISTS "course_knowledge_links_course_idx"
  ON "course_knowledge_links" ("course_id");
CREATE INDEX IF NOT EXISTS "course_knowledge_links_document_idx"
  ON "course_knowledge_links" ("document_id");

CREATE TABLE IF NOT EXISTS "knowledge_sync_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "connector_id" uuid NOT NULL REFERENCES "knowledge_connectors"("id") ON DELETE cascade,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "status" text DEFAULT 'running' NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp,
  "created_count" integer DEFAULT 0 NOT NULL,
  "updated_count" integer DEFAULT 0 NOT NULL,
  "skipped_count" integer DEFAULT 0 NOT NULL,
  "error_count" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "meta" jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS "knowledge_sync_runs_connector_idx"
  ON "knowledge_sync_runs" ("connector_id");

-- Backfill: course materials → workspace documents + v1 + course links.
INSERT INTO "knowledge_documents" (
  "id", "workspace_id", "title", "source_kind", "mime_type", "byte_size",
  "external_url", "status", "error_message", "legacy_material_id",
  "created_by_user_id", "deleted_at", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  c."workspace_id",
  m."title",
  CASE WHEN m."source_type" = 'URL' THEN 'URL' ELSE 'UPLOAD' END,
  m."mime_type",
  m."byte_size",
  m."external_url",
  m."status",
  m."error_message",
  m."id",
  m."uploaded_by_user_id",
  m."deleted_at",
  m."created_at",
  m."updated_at"
FROM "course_materials" m
JOIN "courses" c ON c."id" = m."course_id"
WHERE c."workspace_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "knowledge_documents" d WHERE d."legacy_material_id" = m."id"
  );

INSERT INTO "knowledge_document_versions" (
  "id", "document_id", "version", "s3_key", "byte_size", "mime_type",
  "ocr_used", "created_by_user_id", "created_at"
)
SELECT
  gen_random_uuid(),
  d."id",
  1,
  m."s3_key",
  m."byte_size",
  m."mime_type",
  false,
  d."created_by_user_id",
  d."created_at"
FROM "knowledge_documents" d
JOIN "course_materials" m ON m."id" = d."legacy_material_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "knowledge_document_versions" v WHERE v."document_id" = d."id"
);

UPDATE "knowledge_documents" d
SET "current_version_id" = v."id"
FROM "knowledge_document_versions" v
WHERE v."document_id" = d."id" AND v."version" = 1 AND d."current_version_id" IS NULL;

INSERT INTO "course_knowledge_links" ("course_id", "document_id", "linked_by_user_id", "created_at")
SELECT
  m."course_id",
  d."id",
  m."uploaded_by_user_id",
  m."created_at"
FROM "knowledge_documents" d
JOIN "course_materials" m ON m."id" = d."legacy_material_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "course_knowledge_links" l
  WHERE l."course_id" = m."course_id" AND l."document_id" = d."id"
);

-- Copy embeddings into knowledge_chunks for current versions (best-effort).
INSERT INTO "knowledge_chunks" (
  "document_id", "version_id", "workspace_id", "chunk_index", "content",
  "token_count", "embedding", "created_at"
)
SELECT
  d."id",
  d."current_version_id",
  d."workspace_id",
  ch."chunk_index",
  ch."content",
  ch."token_count",
  ch."embedding",
  ch."created_at"
FROM "course_material_chunks" ch
JOIN "knowledge_documents" d ON d."legacy_material_id" = ch."material_id"
WHERE d."current_version_id" IS NOT NULL
  AND ch."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "knowledge_chunks" kc
    WHERE kc."version_id" = d."current_version_id"
      AND kc."chunk_index" = ch."chunk_index"
  );
