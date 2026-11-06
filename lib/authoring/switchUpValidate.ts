/**
 * Switch-up auto-validation: original key must fail the variant;
 * reference answers should score similarly on both.
 */
import type { OutlineItemBody } from '@/app/db/schema';

export type SwitchUpKeyCheck = {
  ok: boolean;
  reasons: string[];
  originalKeyFailsVariant: boolean;
  refParityOk: boolean;
  similarity: number;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** True if original MCQ/TF keys still work as answers on the new item. */
export function originalKeysStillWork(
  before: OutlineItemBody,
  after: OutlineItemBody,
): boolean {
  const bq = before.questions ?? [];
  const aq = after.questions ?? [];
  if (bq.length === 0 || aq.length === 0) return false;

  let reusable = 0;
  let checked = 0;
  for (let i = 0; i < Math.min(bq.length, aq.length); i += 1) {
    const oldQ = bq[i]!;
    const newQ = aq[i]!;
    const oldKey = (oldQ.correctAnswer ?? '').trim();
    if (!oldKey) continue;
    checked += 1;

    if (newQ.type === 'MULTIPLE_CHOICE') {
      const opts = (newQ.options ?? []).map(normalize);
      if (opts.includes(normalize(oldKey))) reusable += 1;
    } else if (newQ.type === 'TRUE_FALSE') {
      if (normalize(newQ.correctAnswer ?? '') === normalize(oldKey)) {
        // Same TF key is OK if stem changed enough — count as reuse only if stem similar
        if (normalize(oldQ.question) === normalize(newQ.question)) {
          reusable += 1;
        }
      }
    } else if (newQ.type === 'SHORT_ANSWER') {
      // Original SA key as student answer should not equal new correctAnswer
      if (normalize(newQ.correctAnswer ?? '') === normalize(oldKey)) {
        reusable += 1;
      }
    }
  }
  if (checked === 0) return false;
  // Fail validation if majority of keys still apply
  return reusable / checked >= 0.5;
}

/**
 * Rough parity: every question that had a key before still has a non-empty
 * key after (reference answers remain gradeable). Length/wording may change.
 */
export function referenceAnswerParity(
  before: OutlineItemBody,
  after: OutlineItemBody,
): boolean {
  const bq = before.questions ?? [];
  const aq = after.questions ?? [];
  if (bq.length === 0 || aq.length === 0) return true;

  let ok = 0;
  let n = 0;
  for (let i = 0; i < Math.min(bq.length, aq.length); i += 1) {
    const oldQ = bq[i]!;
    const newQ = aq[i]!;
    const oldKey = (oldQ.referenceAnswer ?? oldQ.correctAnswer ?? '').trim();
    if (!oldKey) continue;
    n += 1;
    const newKey = (newQ.referenceAnswer ?? newQ.correctAnswer ?? '').trim();
    if (newKey.length > 0) ok += 1;
  }
  if (n === 0) return true;
  return ok / n >= 0.8;
}

export function validateSwitchUpVariant(
  before: OutlineItemBody,
  after: OutlineItemBody,
  similarity: number,
  similarityMax = 0.55,
): SwitchUpKeyCheck {
  const reasons: string[] = [];
  if (similarity > similarityMax) {
    reasons.push(
      `Lexical similarity ${similarity.toFixed(2)} exceeds max ${similarityMax}`,
    );
  }

  const keysStillWork = originalKeysStillWork(before, after);
  const originalKeyFailsVariant = !keysStillWork;
  if (keysStillWork) {
    reasons.push('Original answer keys still work on the variant');
  }

  const refParityOk = referenceAnswerParity(before, after);
  if (!refParityOk) {
    reasons.push('Reference answer / key parity check failed');
  }

  return {
    ok: reasons.length === 0 && originalKeyFailsVariant && refParityOk,
    reasons,
    originalKeyFailsVariant,
    refParityOk,
    similarity,
  };
}
