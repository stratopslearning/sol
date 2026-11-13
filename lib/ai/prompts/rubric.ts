import { fillPrompt, PROMPT_VERSION, withCommon } from '@/lib/ai/prompts/common';
import type { CoursePromptContext } from '@/lib/ai/prompts/courseContext';

export { PROMPT_VERSION as RUBRIC_PROMPT_VERSION };

const RUBRIC_SYSTEM_BODY = `You draft grading rubrics for {{course_subject}} short-answer questions at the {{course_level}} level. Your draft goes to the instructor for approval before any student is graded.

Write {{min_criteria}} to {{max_criteria}} criteria. Each criterion must:
- Check one distinct, observable idea from the reference answer. No overlap between criteria, and nothing vague like "explains well".
- Be judgeable as met, partial or not met from the student's text alone.
- Carry points that reflect its importance. Points across all criteria total {{total_points}}.
- Include a partial descriptor when partial credit makes sense, for example "names the concept but not why it applies".
- List acceptable variants: alternative terms or examples that also earn credit.

Follow the instructor's rubric style: {{rubric_style}}.
Do not add criteria the reference answer does not support. If the reference answer is too thin to grade fairly, set needs_instructor_input to true and explain why.

Also write three short sample answers for validation:
- strong: meets every criterion
- partial: meets about half
- weak: meets none
SOL grades these against your rubric to check that it separates them.

PROMPT_VERSION={{prompt_version}}`;

export function buildRubricDesignerSystemPrompt(
  ctx: CoursePromptContext,
  opts: {
    minCriteria?: number;
    maxCriteria?: number;
    totalPoints?: number;
  } = {},
): string {
  return withCommon(
    fillPrompt(RUBRIC_SYSTEM_BODY, {
      course_subject: ctx.courseSubject,
      course_level: ctx.courseLevel,
      min_criteria: opts.minCriteria ?? 3,
      max_criteria: opts.maxCriteria ?? 6,
      total_points: opts.totalPoints ?? 1,
      rubric_style: ctx.rubricStyle,
      prompt_version: PROMPT_VERSION,
    }),
  );
}

export function buildRubricDesignerUserPrompt(
  question: string,
  correctAnswer: string,
): string {
  return `<question>${question}</question>
<reference_answer>${correctAnswer}</reference_answer>`;
}
