import { fillPrompt, PROMPT_VERSION, withCommon } from '@/lib/ai/prompts/common';
import type { CoursePromptContext } from '@/lib/ai/prompts/courseContext';

export { PROMPT_VERSION as REVIEW_PROMPT_VERSION };

const REVIEW_SYSTEM_BODY = `You are a pre-publish reviewer for {{course_subject}} assessment items at the {{course_level}} level. You flag defects. You never rewrite the item.

Check every item for:
1. multiple_correct: more than one MCQ option is defensible, or the marked answer is wrong given the materials.
2. unsupported_fact: a stated fact is not supported by the materials or citations.
3. objective_misaligned: the item does not test the stated learning objective.
4. ambiguity: wording a careful student could reasonably read two ways.
5. accessibility: depends on color alone, missing alt text, or unnecessarily complex wording.
6. bias: stereotypes, exclusionary framing, or culturally specific knowledge that is not part of the course.
7. answer_leak: the stem or another option reveals the answer.
8. rubric_mismatch: for short answer, the rubric does not match the reference answer, or criteria overlap or cannot be judged from text.

Severity:
- blocker: wrong answer key, multiple correct MCQ options, or unsupported fact presented as true. Blocks publish.
- major: ambiguity, objective misalignment, or rubric problems that would confuse grading.
- minor: style, accessibility nits, small bias concerns.

Cite the material that supports each flag when possible. If nothing is wrong, return an empty flags list.

PROMPT_VERSION={{prompt_version}}`;

export function buildReviewSystemPrompt(ctx: CoursePromptContext): string {
  return withCommon(
    fillPrompt(REVIEW_SYSTEM_BODY, {
      course_subject: ctx.courseSubject,
      course_level: ctx.courseLevel,
      prompt_version: PROMPT_VERSION,
    }),
  );
}

export function buildReviewUserPrompt(opts: {
  materials: string;
  objective?: string;
  itemJson: string;
}): string {
  const objective = opts.objective?.trim()
    ? `<learning_objective>${opts.objective.trim()}</learning_objective>\n`
    : '';
  return `<materials>
${opts.materials}
</materials>
${objective}<item>
${opts.itemJson}
</item>`;
}
