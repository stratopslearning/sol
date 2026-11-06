import { heuristicReviewFlags } from '@/lib/authoring/review';
import { validateSwitchUpVariant } from '@/lib/authoring/switchUpValidate';
import { itemBodySimilarity } from '@/lib/authoring/switchUp';
import type { OutlineItemBody } from '@/app/db/schema';
import type {
  AuthoringBuildCase,
  ReviewerEvalCase,
  SwitchUpEvalCase,
} from '@/evals/datasets/authoring';

export function scoreAuthoringBuildCitations(args: {
  input: AuthoringBuildCase;
}): { name: string; score: number } {
  const { body, sourceMaterialIds, expectHasCitation, expectHasRubric } =
    args.input;
  const hasCite =
    sourceMaterialIds.length > 0 ||
    (body.sourceCitations?.length ?? 0) > 0 ||
    (body.questions ?? []).some((q) => (q.sourceCitations?.length ?? 0) > 0);
  const hasRubric = (body.questions ?? []).some(
    (q) => Array.isArray(q.rubric) && q.rubric.length > 0,
  );
  const citeOk = hasCite === expectHasCitation ? 1 : 0;
  const rubricOk = hasRubric === expectHasRubric ? 1 : 0;
  return { name: 'build_traceability', score: (citeOk + rubricOk) / 2 };
}

export function scoreSwitchUpKeyCheck(args: {
  input: SwitchUpEvalCase;
}): { name: string; score: number } {
  const before = args.input.before as OutlineItemBody;
  const after = args.input.after as OutlineItemBody;
  const sim = itemBodySimilarity(before, after);
  const check = validateSwitchUpVariant(before, after, sim);
  return {
    name: 'switch_up_key_check',
    score: check.ok === args.input.expectOk ? 1 : 0,
  };
}

export function scoreReviewerFlags(args: {
  input: ReviewerEvalCase;
}): { name: string; score: number } {
  const flags = heuristicReviewFlags(
    args.input.body as OutlineItemBody,
    args.input.sourceMaterialIds,
  );
  const codes = new Set(flags.map((f) => f.code));
  const hits = args.input.expectCodes.filter((c) => codes.has(c as never));
  const score =
    args.input.expectCodes.length === 0
      ? 1
      : hits.length / args.input.expectCodes.length;
  return { name: 'reviewer_flags', score };
}
