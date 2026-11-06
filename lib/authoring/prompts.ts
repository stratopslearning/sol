/**
 * Authoring prompts — re-exports from lib/ai/prompts (v2).
 * Call sites that need course-scoped prompts should prefer the builders
 * with CoursePromptContext; the constants below use default course context.
 */
import {
  AUTHORING_PROMPT_VERSION,
  AUTHORING_OUTLINE_FIXUP_PROMPT,
  buildAuthoringAgentPlannerPrompt,
  buildFaithfulBuildSystemPrompt,
  buildOutlineSystemPrompt,
  buildRefineSystemPrompt,
  buildSkeletonSystemPrompt,
  buildSwitchUpSystemPrompt,
  defaultAuthoringQuery,
  defaultCoursePromptContext,
  formatAuthoringPolicyPrompt,
} from '@/lib/ai/prompts';
import { buildReviewSystemPrompt } from '@/lib/ai/prompts/review';

const defaultCtx = defaultCoursePromptContext();

/** @deprecated Prefer buildSkeletonSystemPrompt(ctx) with course context. */
export const AUTHORING_OUTLINE_SYSTEM_PROMPT = buildOutlineSystemPrompt(defaultCtx);

/** @deprecated Prefer buildSkeletonSystemPrompt(ctx). */
export const AUTHORING_SKELETON_SYSTEM_PROMPT =
  buildSkeletonSystemPrompt(defaultCtx);

/** @deprecated Prefer buildFaithfulBuildSystemPrompt(ctx). */
export const AUTHORING_FAITHFUL_BUILD_SYSTEM_PROMPT =
  buildFaithfulBuildSystemPrompt(defaultCtx);

/** @deprecated Prefer buildRefineSystemPrompt(ctx). */
export const AUTHORING_REFINE_SYSTEM_PROMPT = buildRefineSystemPrompt(defaultCtx);

/** @deprecated Prefer buildSwitchUpSystemPrompt(ctx). */
export const AUTHORING_SWITCH_UP_SYSTEM_PROMPT =
  buildSwitchUpSystemPrompt(defaultCtx);

/** @deprecated Prefer buildReviewSystemPrompt(ctx). */
export const AUTHORING_REVIEW_SYSTEM_PROMPT = buildReviewSystemPrompt(defaultCtx);

export const AUTHORING_REVIEW_PROMPT_VERSION = AUTHORING_PROMPT_VERSION;

export {
  AUTHORING_OUTLINE_FIXUP_PROMPT,
  AUTHORING_PROMPT_VERSION,
  defaultAuthoringQuery,
  formatAuthoringPolicyPrompt,
  buildSkeletonSystemPrompt,
  buildOutlineSystemPrompt,
  buildFaithfulBuildSystemPrompt,
  buildRefineSystemPrompt,
  buildAuthoringAgentPlannerPrompt,
  buildSwitchUpSystemPrompt,
  buildReviewSystemPrompt,
};
