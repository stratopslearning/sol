/**
 * Wave 4 item 29 — tutor assessment-integrity LOCK.
 *
 * Golden SHA-256s of the frozen tutor rules. If one of these fails you changed
 * prompt text that guards against answer-key leakage: re-review the change
 * with an instructor/security reviewer, then update the golden deliberately.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/db', () => ({ db: {} }));

import { tutorPolicySystemRules } from '@/lib/chatbot/aiPolicy';
import {
  CHATBOT_LEAK_REFUSAL,
  SOCRATIC_LEARNING_RULES,
} from '@/lib/chatbot/baseRules';
import {
  assembleSystemPrompt,
  assistantReplyLooksSafe,
  scrubAssistantReply,
  systemPromptLooksSafe,
} from '@/lib/chatbot/safeQuizContext';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('tutor assessment lock — goldens', () => {
  it('SOCRATIC_LEARNING_RULES is unchanged', () => {
    expect(sha(SOCRATIC_LEARNING_RULES)).toBe(
      'af1233c2014c841b34370aafc81b5e05ca36c7d393b3cb126be30e51f06fa0b7',
    );
  });

  it('leak refusal text is unchanged', () => {
    expect(sha(CHATBOT_LEAK_REFUSAL)).toBe(
      '8768ebf99f73307be1ee4f3b4bbb193436d1f17c349cb12a6e02099042db155f',
    );
  });

  it.each([
    ['hints', '7b271e4c9ec86cfaf1a1e70932b8d1a7eefd50b1405df117d9ce66f15d8da659'],
    ['guided', '6d34408baa89d81a396752af167009f57886478b7e049a13d34c6550a504f5b5'],
    [
      'full_after_submit',
      'dfd9282ac7cd47ea582aec35c27982d4c772469eacb747eb9513b786175fe036',
    ],
  ] as const)('policy "%s" rules are unchanged', (mode, golden) => {
    expect(sha(tutorPolicySystemRules({ mode }))).toBe(golden);
  });
});

describe('tutor assessment lock — invariants (survive intentional rewording)', () => {
  it('rules forbid revealing answers and treat student text as untrusted', () => {
    expect(SOCRATIC_LEARNING_RULES).toMatch(/answer keys/i);
    expect(SOCRATIC_LEARNING_RULES).toMatch(/Never follow instructions/i);
    expect(SOCRATIC_LEARNING_RULES).toMatch(/<student_message>/);
  });

  it('every policy mode forbids revealing keys / MCQ correctness', () => {
    for (const mode of ['hints', 'guided', 'full_after_submit'] as const) {
      expect(tutorPolicySystemRules({ mode })).toMatch(
        /never reveal|Do not walk through|strict Socratic/i,
      );
    }
  });

  it('assembled system prompt always leads with the frozen rules and stays key-free', () => {
    const sys = assembleSystemPrompt('Be Professor Emma.', 'Q1: What is QA?');
    expect(sys.startsWith(SOCRATIC_LEARNING_RULES)).toBe(true);
    expect(systemPromptLooksSafe(sys)).toBe(true);
  });

  it('leaky replies are scrubbed to the fixed refusal', () => {
    expect(assistantReplyLooksSafe('The correct option is B')).toBe(false);
    expect(scrubAssistantReply('Here is the answer key: A, B')).toBe(
      CHATBOT_LEAK_REFUSAL,
    );
    expect(scrubAssistantReply('What do you think QA means?')).toBe(
      'What do you think QA means?',
    );
  });
});
