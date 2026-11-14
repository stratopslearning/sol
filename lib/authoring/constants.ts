import { PROMPT_VERSION } from '@/lib/ai/prompts/common';
import { defaultAuthoringModel } from '@/lib/ai/modelRouter';

/** Authoring retrieve: more chunks / larger budget than student tutor. */
export const AUTHORING_RETRIEVE_TOP_K = 12;
export const AUTHORING_CONTEXT_CHAR_BUDGET = 16_000;

/**
 * @deprecated Prefer resolveModel(task).model — kept for call-site migration.
 * Defaults to outline (fast) tier; builder/review should use resolveModel('build').
 */
export const AUTHORING_MODEL = defaultAuthoringModel('outline');

/** Default quiz window when publishing from an outline item (14 days). */
export const DEFAULT_QUIZ_WINDOW_DAYS = 14;

/** Prompt provenance — bump when authoring system prompts change. */
export const AUTHORING_PROMPT_VERSION = PROMPT_VERSION;
