import type { OutlineItemBody } from '@/app/db/schema';
import { normalizeQuizScheduleToFuture } from '@/lib/authoring/schedule';

type QuizQuestion = NonNullable<OutlineItemBody['questions']>[number];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Read stem text from common model field names. */
export function questionStem(
  q: QuizQuestion | Record<string, unknown> | null | undefined,
): string {
  if (!q) return '';
  const rec = q as Record<string, unknown>;
  for (const key of ['question', 'prompt', 'stem', 'text'] as const) {
    const v = rec[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export function questionHasStem(
  q: QuizQuestion | Record<string, unknown> | null | undefined,
): boolean {
  return questionStem(q).length > 0;
}

export function isHollowQuizBody(
  body: OutlineItemBody | null | undefined,
): boolean {
  const questions = body?.questions ?? [];
  if (questions.length === 0) return false;
  const withStem = questions.filter(questionHasStem).length;
  // Hollow if most stems are gone (protects against partial wipes too).
  return withStem === 0 || withStem < Math.ceil(questions.length * 0.5);
}

/** True when a patch question only carries scoring/meta, not a real stem. */
function isPointsOnlyQuestion(q: QuizQuestion): boolean {
  if (questionHasStem(q)) return false;
  const keys = Object.keys(q as object).filter((k) => {
    const v = (q as Record<string, unknown>)[k];
    if (v == null) return false;
    if (typeof v === 'string' && !v.trim()) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  return keys.every((k) =>
    ['points', 'conceptTags', 'sourceCitations', 'order', 'id'].includes(k),
  );
}

function mergeQuestion(
  existing: QuizQuestion | undefined,
  patch: QuizQuestion,
): QuizQuestion {
  if (!existing) {
    const stem = questionStem(patch);
    return {
      ...patch,
      question: stem || patch.question || '',
    };
  }

  // Apply patch fields except stem keys — stem only wins when non-empty.
  const patchRec = patch as Record<string, unknown>;
  const {
    question: _q,
    prompt: _p,
    stem: _s,
    text: _t,
    options: patchOptions,
    correctAnswer: patchCorrect,
    ...rest
  } = patchRec;

  const merged: QuizQuestion = {
    ...existing,
    ...(rest as Partial<QuizQuestion>),
  };

  const patchStem = questionStem(patch);
  merged.question = patchStem || questionStem(existing) || existing.question;

  if (!merged.type && existing.type) merged.type = existing.type;

  if (Array.isArray(patchOptions) && patchOptions.length > 0) {
    merged.options = patchOptions as string[];
  } else if (existing.options?.length) {
    merged.options = existing.options;
  }

  if (typeof patchCorrect === 'string' && patchCorrect.trim()) {
    merged.correctAnswer = patchCorrect;
  } else if (existing.correctAnswer) {
    merged.correctAnswer = existing.correctAnswer;
  }

  if (!merged.referenceAnswer && existing.referenceAnswer) {
    merged.referenceAnswer = existing.referenceAnswer;
  }
  if (!merged.rubric?.length && existing.rubric?.length) {
    merged.rubric = existing.rubric;
  }
  if (!merged.conceptTags?.length && existing.conceptTags?.length) {
    merged.conceptTags = existing.conceptTags;
  }
  return merged;
}

function mergeQuestions(
  existing: OutlineItemBody['questions'] | undefined,
  patch: OutlineItemBody['questions'] | undefined,
): OutlineItemBody['questions'] | undefined {
  if (patch == null) return existing;
  if (!existing?.length) return patch;

  // Points-only / hollow patches never replace existing stems.
  const pointsOnly =
    patch.length > 0 && patch.every((q) => isPointsOnlyQuestion(q) || !questionHasStem(q));

  if (pointsOnly && existing.some(questionHasStem)) {
    return existing.map((eq, i) => {
      const pq = patch[i];
      return pq ? mergeQuestion(eq, pq) : eq;
    });
  }

  // Full rewrite: merge per index, never drop a stem that the patch left empty.
  const len = Math.max(existing.length, patch.length);
  const out: QuizQuestion[] = [];
  for (let i = 0; i < len; i += 1) {
    const eq = existing[i];
    const pq = patch[i];
    if (eq && pq) out.push(mergeQuestion(eq, pq));
    else if (eq) out.push(eq);
    else if (pq) out.push(pq);
  }

  // Hard safety: if we lost most stems, keep the previous questions list.
  if (
    existing.some(questionHasStem) &&
    isHollowQuizBody({ questions: out })
  ) {
    return existing.map((eq, i) => {
      const pq = patch[i];
      if (!pq) return eq;
      // Still allow points overlay
      return mergeQuestion(eq, {
        points: pq.points,
      } as QuizQuestion);
    });
  }

  return out;
}

const SCHEDULE_KEYS = new Set([
  'maxAttempts',
  'passingScore',
  'timeLimit',
  'startDate',
  'endDate',
  'questions',
  'description',
]);

/**
 * When the professor asks for dates/timing/points, ignore any accidental
 * content rewrite in the model patch and only keep schedule/scoring fields.
 */
export function pickScheduleScoringPatch(
  patch: OutlineItemBody | Record<string, unknown> | null | undefined,
): OutlineItemBody {
  const p = asRecord(patch);
  if (!p) return {};
  const out: OutlineItemBody = {};
  for (const key of SCHEDULE_KEYS) {
    if (key in p) {
      (out as Record<string, unknown>)[key] = p[key];
    }
  }
  if (Array.isArray(out.questions)) {
    out.questions = out.questions.map(
      (q) =>
        ({
          points: q.points,
        }) as QuizQuestion,
    );
  }
  return out;
}

export function looksLikeScheduleOnlyRequest(message: string): boolean {
  const m = message.toLowerCase();
  const scheduleHit =
    /due date|start date|end date|opens|timing|time limit|timelimit|schedule|deadline|attempts|passing score|pass %|points|minutes/.test(
      m,
    );
  const rewriteHit =
    /rewrite|rephrase|harder|easier|new question|replace question|different question|regenerate quiz|redo the quiz|change the options|fix the stem/.test(
      m,
    );
  return scheduleHit && !rewriteHit;
}

/**
 * Deep-merge outline item body patches so schedule/points updates cannot
 * wipe quiz stems, options, or discussion prompts.
 */
export function mergeOutlineItemBody(
  existing: OutlineItemBody,
  patch: OutlineItemBody | Record<string, unknown> | null | undefined,
): OutlineItemBody {
  const p = asRecord(patch);
  if (!p) return existing;

  const next: OutlineItemBody = {
    ...existing,
  };

  // Copy non-question scalar fields from patch when present.
  for (const [key, value] of Object.entries(p)) {
    if (key === 'questions' || key === 'interactiveBody') continue;
    if (value === undefined) continue;
    (next as Record<string, unknown>)[key] = value;
  }

  if ('questions' in p) {
    next.questions = mergeQuestions(
      existing.questions,
      (p.questions as OutlineItemBody['questions']) ?? undefined,
    );
  }

  // Never blank out discussion fields with empty strings from a sparse patch.
  if (
    typeof p.systemPrompt === 'string' &&
    !p.systemPrompt.trim() &&
    existing.systemPrompt?.trim()
  ) {
    next.systemPrompt = existing.systemPrompt;
  }
  if (
    typeof p.instructions === 'string' &&
    !p.instructions.trim() &&
    existing.instructions?.trim()
  ) {
    next.instructions = existing.instructions;
  }

  if (
    p.interactiveBody != null &&
    typeof p.interactiveBody === 'object' &&
    existing.interactiveBody
  ) {
    next.interactiveBody = {
      ...existing.interactiveBody,
      ...(p.interactiveBody as OutlineItemBody['interactiveBody']),
    };
  }

  // Final guard: never persist a hollow quiz when we had content.
  if (
    !isHollowQuizBody(existing) &&
    isHollowQuizBody(next) &&
    existing.questions?.length
  ) {
    next.questions = existing.questions.map((eq, i) => {
      const pq = Array.isArray(p.questions)
        ? (p.questions as QuizQuestion[])[i]
        : undefined;
      return pq?.points != null ? { ...eq, points: pq.points } : eq;
    });
  }

  return normalizeQuizScheduleToFuture(next);
}

/** Restore quiz stems from a prior body while keeping schedule/points from current. */
export function restoreQuizContentFromFallback(
  current: OutlineItemBody,
  fallback: OutlineItemBody | null | undefined,
): OutlineItemBody {
  if (!fallback?.questions?.length) return current;
  if (!isHollowQuizBody(current)) return current;
  return mergeOutlineItemBody(fallback, {
    maxAttempts: current.maxAttempts,
    passingScore: current.passingScore,
    timeLimit: current.timeLimit,
    startDate: current.startDate,
    endDate: current.endDate,
    questions: (current.questions ?? fallback.questions).map((q, i) => ({
      points: q.points ?? fallback.questions?.[i]?.points,
    })) as QuizQuestion[],
  });
}
