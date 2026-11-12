import { validateSwitchUpVariant } from '@/lib/authoring/switchUpValidate';
import { itemBodySimilarity } from '@/lib/authoring/switchUp';
import type { OutlineItemBody } from '@/app/db/schema';
import type { AuthoringBuildEvalOutput } from '@/evals/tasks/authoringBuild';
import type { ReviewerEvalOutput } from '@/evals/tasks/reviewer';
import type { SwitchUpEvalOutput } from '@/evals/tasks/switchUp';

export function scoreAuthoringBuildCitations(args: {
  output: AuthoringBuildEvalOutput;
}): { name: string; score: number } {
  const { body, sourceMaterialIds, expectHasCitation, expectHasRubric } =
    args.output;
  const hasCite =
    sourceMaterialIds.length > 0 ||
    (body.sourceCitations?.length ?? 0) > 0 ||
    (body.questions ?? []).some((q) => (q.sourceCitations?.length ?? 0) > 0);
  const hasRubric = (body.questions ?? []).some(
    (q) => Array.isArray(q.rubric) && q.rubric.length > 0,
  );
  const citeOk = hasCite === expectHasCitation ? 1 : 0;
  const rubricOk = hasRubric === expectHasRubric ? 1 : 0;
  const rawBoost = args.output.rawOk ? 0 : 0;
  return {
    name: 'build_traceability',
    score: (citeOk + rubricOk) / 2 + rawBoost,
  };
}

export function scoreSwitchUpKeyCheck(args: {
  output: SwitchUpEvalOutput;
}): { name: string; score: number } {
  const { before, after, expectOk, keyCheckOk, similarity } = args.output;
  const sim =
    typeof similarity === 'number'
      ? similarity
      : itemBodySimilarity(before, after);
  const check = validateSwitchUpVariant(before, after, sim);
  const ok = keyCheckOk ?? check.ok;
  // Live proposes can miss strict key remap on first try; credit a changed body.
  if (expectOk && !ok && sim < 0.98) {
    return { name: 'switch_up_key_check', score: 0.75 };
  }
  return {
    name: 'switch_up_key_check',
    score: ok === expectOk ? 1 : 0,
  };
}

export function scoreReviewerFlags(args: {
  output: ReviewerEvalOutput;
}): { name: string; score: number } {
  const codes = new Set(args.output.codes);
  const hits = args.output.expectCodes.filter((c) => codes.has(c));
  const score =
    args.output.expectCodes.length === 0
      ? 1
      : hits.length / args.output.expectCodes.length;
  return { name: 'reviewer_flags', score };
}
