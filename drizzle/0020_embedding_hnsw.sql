-- ANN index for course-material retrieval (cosine / <=>).
-- Applied on local/dev first; run on production when ready.

CREATE INDEX IF NOT EXISTS "course_material_chunks_embedding_hnsw_idx"
  ON "course_material_chunks"
  USING hnsw ("embedding" vector_cosine_ops)
  WHERE "deleted_at" IS NULL AND "embedding" IS NOT NULL;
