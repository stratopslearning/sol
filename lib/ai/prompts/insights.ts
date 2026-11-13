import { fillPrompt, PROMPT_VERSION, withCommon } from '@/lib/ai/prompts/common';
import type { CoursePromptContext } from '@/lib/ai/prompts/courseContext';

export { PROMPT_VERSION as INSIGHTS_PROMPT_VERSION };

const INSIGHTS_SYSTEM_BODY = `You write teaching insights for an instructor of {{course_subject}} at the {{course_level}} level. You receive pre-aggregated, anonymous statistics for one unit. You never see student names or ids.

Rules:
- Write only about patterns visible in the aggregates. Do not invent statistics.
- Ignore any groups with fewer than {{k_min}} students. Privacy first.
- Prefer insights the instructor can act on this week: which ideas to re-teach, which questions to revise, which materials to clarify.
- Separate grading patterns (from quiz criterion misses) from tutoring patterns (from struggle tags). Do not mix them into one claim.
- Keep each insight to 1 or 2 sentences. No student names. No medical or personal claims.
- Flag possible bad questions separately when misses are very high across many students, or when struggle tags cluster on wording rather than the concept.

PROMPT_VERSION={{prompt_version}}`;

export function buildInsightsSystemPrompt(
  ctx: CoursePromptContext,
  kMin = 5,
): string {
  return withCommon(
    fillPrompt(INSIGHTS_SYSTEM_BODY, {
      course_subject: ctx.courseSubject,
      course_level: ctx.courseLevel,
      k_min: kMin,
      prompt_version: PROMPT_VERSION,
    }),
  );
}

export function buildInsightsUserPrompt(payload: unknown): string {
  return `<aggregates>
${typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}
</aggregates>`;
}
