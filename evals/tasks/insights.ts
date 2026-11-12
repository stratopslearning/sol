/**
 * Live insights eval — completeJsonSchema over anonymous aggregates (no DB).
 */
import { getAiClientForTask, resolveModel } from '@/lib/ai/gateway';
import { defaultCoursePromptContext } from '@/lib/ai/prompts/courseContext';
import {
  buildInsightsSystemPrompt,
  buildInsightsUserPrompt,
  INSIGHTS_PROMPT_VERSION,
} from '@/lib/ai/prompts/insights';
import { completeJsonSchema } from '@/lib/ai/structured';
import type { InsightsEvalCase } from '@/evals/datasets/insights';
import { z } from 'zod';

const insightsZod = z.object({
  misconceptions: z.array(
    z.object({
      topic: z.string().min(1).max(120),
      summary: z.string().min(1).max(800),
      evidenceCount: z.number().int().min(0).optional(),
    }),
  ),
  suggestions: z.array(
    z.object({
      target: z.string().min(1).max(200),
      revision: z.string().min(1).max(1_000),
      relatedQuestionIds: z.array(z.string()).optional(),
    }),
  ),
});

const insightsJsonSchema = {
  type: 'object' as const,
  properties: {
    misconceptions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          summary: { type: 'string' },
          evidenceCount: { type: 'number' },
        },
        required: ['topic', 'summary', 'evidenceCount'],
        additionalProperties: false,
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          revision: { type: 'string' },
          relatedQuestionIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['target', 'revision', 'relatedQuestionIds'],
        additionalProperties: false,
      },
    },
  },
  required: ['misconceptions', 'suggestions'],
  additionalProperties: false,
};

export type InsightsEvalOutput = {
  misconceptionCount: number;
  suggestionCount: number;
  expectMinMisconceptions: number;
  expectMinSuggestions: number;
  textBlob: string;
};

export async function runInsightsEval(
  input: InsightsEvalCase,
): Promise<InsightsEvalOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY required for insights eval');
  }

  const client = getAiClientForTask('insights', { timeout: 90_000 });
  const resolved = resolveModel('insights');
  const ctx = defaultCoursePromptContext({ courseTitle: 'Inventory 101' });

  const result = await completeJsonSchema({
    client,
    task: 'insights',
    model: resolved.model,
    messages: [
      {
        role: 'system',
        content: buildInsightsSystemPrompt(ctx, input.kMin),
      },
      {
        role: 'user',
        content: buildInsightsUserPrompt({
          kMin: input.kMin,
          criterionMissRates: input.criterionMissRates,
          struggleTopicCounts: input.struggleTopicCounts,
          cappedExcerpts: input.cappedExcerpts,
        }),
      },
    ],
    schemaName: 'unit_insights',
    jsonSchema: insightsJsonSchema,
    zodSchema: insightsZod,
    maxCompletionTokens: 2_000,
    temperature: 0.3,
    promptVersion: INSIGHTS_PROMPT_VERSION,
  });

  if (!result.ok) {
    return {
      misconceptionCount: 0,
      suggestionCount: 0,
      expectMinMisconceptions: input.expectMinMisconceptions,
      expectMinSuggestions: input.expectMinSuggestions,
      textBlob: '',
    };
  }

  const textBlob = JSON.stringify(result.value).toLowerCase();
  return {
    misconceptionCount: result.value.misconceptions.length,
    suggestionCount: result.value.suggestions.length,
    expectMinMisconceptions: input.expectMinMisconceptions,
    expectMinSuggestions: input.expectMinSuggestions,
    textBlob,
  };
}
