/**
 * Live authoring reviewer eval — LLM + heuristic fallback, no DB writes.
 */
import { getAiClientForTask, resolveModel } from '@/lib/ai/gateway';
import { defaultCoursePromptContext } from '@/lib/ai/prompts/courseContext';
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  REVIEW_PROMPT_VERSION,
} from '@/lib/ai/prompts/review';
import { completeJsonSchema } from '@/lib/ai/structured';
import { heuristicReviewFlags } from '@/lib/authoring/review';
import type { OutlineItemBody } from '@/app/db/schema';
import type { ReviewerEvalCase } from '@/evals/datasets/authoring';
import { z } from 'zod';

const FLAG_CODES = [
  'multiple_correct',
  'unsupported_fact',
  'objective_misaligned',
  'ambiguity',
  'accessibility',
  'bias',
  'answer_leak',
  'rubric_mismatch',
  'ambiguous_wording',
  'answer_in_stem',
  'missing_source',
  'difficulty_imbalance',
] as const;

const reviewZod = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      flags: z.array(
        z.object({
          code: z.enum(FLAG_CODES),
          message: z.string().min(1).max(500),
          questionIndex: z.number().int().min(0).optional(),
          severity: z.enum(['info', 'warning', 'blocker']).optional(),
        }),
      ),
    }),
  ),
});

const reviewJsonSchema = {
  type: 'object' as const,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          flags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                questionIndex: { type: 'number' },
                severity: { type: 'string' },
              },
              required: ['code', 'message'],
              additionalProperties: false,
            },
          },
        },
        required: ['itemId', 'flags'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

export type ReviewerEvalOutput = {
  codes: string[];
  expectCodes: string[];
};

export async function runReviewerEval(
  input: ReviewerEvalCase,
): Promise<ReviewerEvalOutput> {
  const body = input.body as OutlineItemBody;
  const heuristic = heuristicReviewFlags(body, input.sourceMaterialIds);
  const codes = new Set(heuristic.map((f) => f.code));

  if (process.env.OPENAI_API_KEY) {
    try {
      const client = getAiClientForTask('review', { timeout: 90_000 });
      const model = resolveModel('review').model;
      const itemId = '00000000-0000-4000-8000-000000000003';
      const ctx = defaultCoursePromptContext({ courseTitle: 'Eval Course' });
      const result = await completeJsonSchema({
        client,
        task: 'review',
        model,
        messages: [
          { role: 'system', content: buildReviewSystemPrompt(ctx) },
          {
            role: 'user',
            content: buildReviewUserPrompt({
              materials: '(see item source citations)',
              itemJson: JSON.stringify([
                {
                  itemId,
                  type: 'QUIZ',
                  title: 'Eval item',
                  body,
                  sourceMaterialIds: input.sourceMaterialIds,
                },
              ]),
            }),
          },
        ],
        schemaName: 'authoring_review',
        jsonSchema: reviewJsonSchema,
        zodSchema: reviewZod,
        maxCompletionTokens: 2_000,
        temperature: 0.2,
        promptVersion: REVIEW_PROMPT_VERSION,
      });
      if (result.ok) {
        for (const row of result.value.items) {
          for (const flag of row.flags) codes.add(flag.code);
        }
      }
    } catch {
      /* heuristics already applied */
    }
  }

  return { codes: [...codes], expectCodes: input.expectCodes };
}
