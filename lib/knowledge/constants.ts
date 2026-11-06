import { defaultEmbedModel } from '@/lib/ai/modelRouter';

/** Soft char budget for course-material context injected into chatbot prompts. */
export const SAFE_MATERIALS_CONTEXT_CHAR_BUDGET = 4_000;

/** Top-k chunks retrieved per student turn. */
export const MATERIALS_RETRIEVE_TOP_K = 6;

/** Approx chars per embedding/chunk target (~500 tokens). */
export const CHUNK_TARGET_CHARS = 2_000;
export const CHUNK_OVERLAP_CHARS = 200;

/** Max upload size (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Max size for a Knowledge zip pack (50 MB). */
export const MAX_ZIP_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Cap extracted Knowledge docs per zip. */
export const MAX_ZIP_KNOWLEDGE_FILES = 40;

/** Max nesting depth for paths inside a Knowledge zip. */
export const MAX_ZIP_PATH_DEPTH = 8;

export const ALLOWED_UPLOAD_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]);

export const ALLOWED_ZIP_MIME = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);

export const EMBEDDING_MODEL = defaultEmbedModel();
