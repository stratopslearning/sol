/**
 * Auto-derived per-question grading rubric.
 *
 * The rubric is the source of determinism: instead of asking the model "what
 * score?", we ask it "for each criterion, did the student match it?". The
 * final score is then computed in TypeScript via `computeScoreFromRubric`.
 *
 * Rubrics are cached on `questions.rubric` and invalidated by bumping
 * `questions.rubric_version` (done by the quiz update routes when the
 * question text or reference answer changes).
 */
import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { questions } from '@/app/db/schema';
import { GRADING_MODEL_VERSION, type RubricCriterion } from '@/lib/gradingTypes';

const RUBRIC_DERIVATION_TIMEOUT_MS = 20_000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: RUBRIC_DERIVATION_TIMEOUT_MS,
});

const rubricSchemaZod = z.object({
  criteria: z
    .array(
      z.object({
        description: z.string().min(3).max(240),
        weight: z.number().min(0.1).max(5),
      }),
    )
    .min(1)
    .max(8),
});

const rubricJsonSchema = {
  type: 'object' as const,
  properties: {
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          weight: { type: 'number' },
        },
        required: ['description', 'weight'],
        additionalProperties: false,
      },
    },
  },
  required: ['criteria'],
  additionalProperties: false,
};

function rubricPrompt(question: string, correctAnswer: string): string {
  return `You are a strict business professor designing a grading rubric for a short-answer exam question.

QUESTION:
${question}

REFERENCE ANSWER (the only acceptable standard):
${correctAnswer}

TASK: Produce 3-6 grading criteria that a student answer MUST satisfy to earn full credit on this question.

Each criterion must be:
- Specific and verifiable (e.g. "Mentions that quality assurance is process-oriented" rather than "Good answer")
- Independent — criteria should not heavily overlap
- Drawn ONLY from the reference answer's content. Do NOT introduce outside concepts.
- Phrased as a concrete check, not a question

Weights:
- Use weight 1 for primary / required criteria.
- Use weight 0.5 only for clearly secondary or optional details that are minor compared to the main concepts.

Return JSON matching the provided schema. Do not include any other text.`;
}

function isValidRubric(value: unknown): value is RubricCriterion[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (c) =>
      c &&
      typeof c === 'object' &&
      typeof (c as RubricCriterion).id === 'string' &&
      typeof (c as RubricCriterion).description === 'string' &&
      typeof (c as RubricCriterion).weight === 'number',
  );
}

export function readRubricFromColumn(value: unknown): RubricCriterion[] | null {
  if (!isValidRubric(value)) return null;
  return value as RubricCriterion[];
}

/**
 * Compute the final integer score from rubric matches.
 *
 * Score = round((Σ weight × matchedFactor) / Σ weight × maxPoints), clamped
 * to [0, maxPoints]. `matched` contributes 1.0 × weight; `partial && !matched`
 * contributes 0.5 × weight.
 *
 * Empty rubric or zero weights ⇒ 0. Out-of-rubric `criterionId` values from
 * the model are silently ignored (we score only criteria we control).
 */
export function computeScoreFromRubric(
  rubric: RubricCriterion[],
  matches: { criterionId: string; matched: boolean; partial?: boolean }[],
  maxPoints: number,
): number {
  if (rubric.length === 0 || maxPoints <= 0) return 0;

  const totalWeight = rubric.reduce(
    (sum, c) => sum + Math.max(c.weight, 0),
    0,
  );
  if (totalWeight <= 0) return 0;

  const matchById = new Map<string, { matched: boolean; partial?: boolean }>();
  for (const match of matches) {
    matchById.set(match.criterionId, match);
  }

  let weighted = 0;
  for (const criterion of rubric) {
    const weight = Math.max(criterion.weight, 0);
    const match = matchById.get(criterion.id);
    if (!match) continue;
    if (match.matched) {
      weighted += weight;
    } else if (match.partial) {
      weighted += weight * 0.5;
    }
  }

  const raw = (weighted / totalWeight) * maxPoints;
  const rounded = Math.round(raw);
  return Math.min(Math.max(rounded, 0), maxPoints);
}

export class RubricDerivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RubricDerivationError';
  }
}

async function callRubricModel(
  question: string,
  correctAnswer: string,
): Promise<RubricCriterion[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new RubricDerivationError('no_api_key');
  }

  const completion = await openai.chat.completions.create({
    model: GRADING_MODEL_VERSION,
    messages: [
      {
        role: 'system',
        content:
          'You design strict grading rubrics for business exam short-answer questions. You produce concise, verifiable criteria drawn only from the reference answer. Output valid JSON matching the provided schema.',
      },
      { role: 'user', content: rubricPrompt(question, correctAnswer) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'grading_rubric',
        strict: true,
        schema: rubricJsonSchema,
      },
    },
    reasoning_effort: 'low',
    max_completion_tokens: 600,
    seed: 7,
  } as never);

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new RubricDerivationError('empty_response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new RubricDerivationError('invalid_json');
  }

  const validated = rubricSchemaZod.safeParse(parsed);
  if (!validated.success) {
    throw new RubricDerivationError('schema_validation_failed');
  }

  return validated.data.criteria.map((c, index) => ({
    id: `c${index + 1}`,
    description: c.description.trim(),
    weight: c.weight,
  }));
}

/**
 * Build a single-criterion fallback rubric that simply asks "does this answer
 * match the reference?". Used when rubric derivation fails so grading can
 * still proceed deterministically (single weight-1 criterion).
 */
export function fallbackRubric(): RubricCriterion[] {
  return [
    {
      id: 'c1',
      description:
        'The student answer fully matches the reference answer: includes all of the reference answer\'s key concepts, terminology, and accuracy with no significant inaccuracies or omissions.',
      weight: 1,
    },
  ];
}

type GetOrDeriveResult = {
  rubric: RubricCriterion[];
  rubricVersion: number;
  /** True when this call generated and persisted a new rubric. */
  derived: boolean;
  /** True when we fell back to the synthetic single-criterion rubric. */
  fallback?: boolean;
};

type QuestionRow = {
  id: string;
  question: string;
  correctAnswer: string | null;
  rubric: unknown;
  rubricVersion: number;
};

/**
 * Return the question's rubric, deriving + persisting one on the fly if
 * `questions.rubric` is null. Never throws — failures degrade to a minimal
 * fallback rubric so grading can still proceed.
 */
export async function getOrDeriveRubric(
  question: QuestionRow,
): Promise<GetOrDeriveResult> {
  const existing = readRubricFromColumn(question.rubric);
  if (existing) {
    return {
      rubric: existing,
      rubricVersion: question.rubricVersion,
      derived: false,
    };
  }

  const correctAnswer = (question.correctAnswer ?? '').trim();
  if (!correctAnswer) {
    return {
      rubric: fallbackRubric(),
      rubricVersion: question.rubricVersion,
      derived: false,
      fallback: true,
    };
  }

  try {
    const rubric = await callRubricModel(question.question, correctAnswer);
    try {
      await db
        .update(questions)
        .set({ rubric })
        .where(eq(questions.id, question.id));
    } catch (writeErr) {
      console.warn('rubric persist failed (continuing without cache):', writeErr);
    }
    return {
      rubric,
      rubricVersion: question.rubricVersion,
      derived: true,
    };
  } catch (error) {
    console.warn('rubric derivation failed; using fallback:', error);
    return {
      rubric: fallbackRubric(),
      rubricVersion: question.rubricVersion,
      derived: false,
      fallback: true,
    };
  }
}

/** Synchronous variant used when the caller has the rubric in hand. */
export function ensureRubric(value: unknown): RubricCriterion[] {
  const existing = readRubricFromColumn(value);
  return existing ?? fallbackRubric();
}
