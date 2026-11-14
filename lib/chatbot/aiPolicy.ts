export type TutorAiPolicyMode = 'hints' | 'guided' | 'full_after_submit';

export type TutorAiPolicy = {
  mode: TutorAiPolicyMode;
};

export const DEFAULT_TUTOR_AI_POLICY: TutorAiPolicy = { mode: 'guided' };

export function parseAiPolicy(raw: unknown): TutorAiPolicy | null {
  if (!raw || typeof raw !== 'object') return null;
  const mode = (raw as { mode?: string }).mode;
  if (mode === 'hints' || mode === 'guided' || mode === 'full_after_submit') {
    return { mode };
  }
  return null;
}

export function resolveTutorAiPolicy(opts: {
  chatbotPolicy?: unknown;
  coursePolicy?: unknown;
}): TutorAiPolicy {
  return (
    parseAiPolicy(opts.chatbotPolicy) ??
    parseAiPolicy(opts.coursePolicy) ??
    DEFAULT_TUTOR_AI_POLICY
  );
}

/** Server-only rules appended to the chatbot system prompt. */
export function tutorPolicySystemRules(policy: TutorAiPolicy): string {
  switch (policy.mode) {
    case 'hints':
      return `
Tutor policy (hints): Give only small nudges — vocabulary, where to look in materials, or one clarifying question. Do not walk through full solution steps or multi-step derivations unless the student has already submitted the related assessment.
`.trim();
    case 'full_after_submit':
      return `
Tutor policy (full_after_submit): Before the student submits the related quiz, stay in strict Socratic / hints mode. If they say they already submitted, you may explain concepts more directly but still never reveal answer keys or MCQ correctness.
`.trim();
    case 'guided':
    default:
      return `
Tutor policy (guided): Balance Socratic questions with brief explanations when the student is stuck. Never reveal quiz answers or rubric keys.
`.trim();
  }
}

const ESCALATION_PHRASES = [
  'flag instructor',
  'flag my instructor',
  'contact instructor',
  'talk to instructor',
  'tell my professor',
];

const STUCK_PHRASES = [
  "i'm stuck",
  'im stuck',
  "i don't understand",
  'still confused',
  'not getting it',
];

export function userRequestedInstructorEscalation(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return ESCALATION_PHRASES.some((p) => lower.includes(p));
}

export function userSignalsStuck(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return STUCK_PHRASES.some((p) => lower.includes(p));
}

export function countRecentStuckSignals(
  history: Array<{ role: string; content: string }>,
  window = 6,
): number {
  const recent = history.filter((m) => m.role === 'user').slice(-window);
  return recent.filter((m) => userSignalsStuck(m.content)).length;
}

export const INSTRUCTOR_ESCALATION_OFFER =
  'If you need your instructor involved, reply "flag instructor" and describe what you are stuck on. Your instructor can review this discussion thread.';
