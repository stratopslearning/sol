/**
 * Tutor rules — re-export / thin wrappers over lib/ai/prompts/tutor (v2).
 * Kept for call-site compatibility; prefer assembleTutorSystemPrompt.
 */
import {
  assembleTutorSystemPrompt,
  FERPA_DISTRESS_RULES,
  TUTOR_SYSTEM_RULES,
} from '@/lib/ai/prompts/tutor';
import { defaultCoursePromptContext } from '@/lib/ai/prompts/courseContext';
import { PROMPT_VERSION } from '@/lib/ai/prompts/common';

/** @deprecated Prefer assembleTutorSystemPrompt with course context. */
export const SOCRATIC_LEARNING_RULES = assembleTutorSystemPrompt({
  ctx: defaultCoursePromptContext(),
  assessmentLocked: false,
});

export { FERPA_DISTRESS_RULES, TUTOR_SYSTEM_RULES, assembleTutorSystemPrompt };

export const TUTOR_PROMPT_VERSION = PROMPT_VERSION;

/** Safe fallback when a model reply appears to leak answer-key material. */
export const CHATBOT_LEAK_REFUSAL =
  "I can't share quiz answers or answer keys. Let's work through the concept together: what part of the topic would you like to reason about first?";
