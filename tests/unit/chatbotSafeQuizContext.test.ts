import { describe, expect, it } from 'vitest';

import { SOCRATIC_LEARNING_RULES } from '@/lib/chatbot/baseRules';
import {
  assembleSystemPrompt,
  buildSafeQuizContext,
  systemPromptLooksSafe,
  toOpenAiMessages,
  truncateHistory,
} from '@/lib/chatbot/safeQuizContext';
import type { ChatbotMessage } from '@/app/db/schema';

describe('buildSafeQuizContext', () => {
  it('includes stems and option labels but never answer keys or rubrics', () => {
    const context = buildSafeQuizContext({
      title: 'Ch1 Quiz',
      description: 'Internal supply chain',
      questions: [
        {
          order: 0,
          type: 'MULTIPLE_CHOICE',
          question: 'Which department hires employees?',
          options: ['HR', 'Finance', 'Marketing'],
        },
        {
          order: 1,
          type: 'TRUE_FALSE',
          question: 'Silos always help communication.',
        },
        {
          order: 2,
          type: 'SHORT_ANSWER',
          question: 'What is the silo effect?',
        },
      ],
    });

    expect(context).toContain('Ch1 Quiz');
    expect(context).toContain('Which department hires employees?');
    expect(context).toContain('Options (labels only): HR | Finance | Marketing');
    expect(context).toContain('LEARNING MODE');
    expect(context.toLowerCase()).not.toContain('correctanswer');
    expect(context.toLowerCase()).not.toContain('correct_answer');
    expect(context).not.toContain('rubric');
    expect(systemPromptLooksSafe(context)).toBe(true);
  });

  it('returns empty string when quiz is null', () => {
    expect(buildSafeQuizContext(null)).toBe('');
  });
});

describe('assembleSystemPrompt', () => {
  it('always prepends learning-mode Socratic rules', () => {
    const system = assembleSystemPrompt(
      'Discuss departments in hospitals.',
      buildSafeQuizContext({
        title: 'Hospital Quiz',
        questions: [
          { order: 0, type: 'SHORT_ANSWER', question: 'Name one department.' },
        ],
      }),
    );

    expect(system.startsWith(SOCRATIC_LEARNING_RULES)).toBe(true);
    expect(system).toContain('Discuss departments in hospitals.');
    expect(system).toContain('Hospital Quiz');
    expect(system).toContain('never reveal');
    expect(systemPromptLooksSafe(system)).toBe(true);
  });
});

describe('history helpers', () => {
  it('toOpenAiMessages uses server history, not a client-supplied parallel list', () => {
    const history: ChatbotMessage[] = [
      { role: 'user', content: 'Hi', at: '1' },
      { role: 'assistant', content: 'Hello — ready?', at: '2' },
    ];
    const messages = toOpenAiMessages('SYSTEM', history, 'I am ready');
    expect(messages[0]).toEqual({ role: 'system', content: 'SYSTEM' });
    expect(messages[1]).toEqual({ role: 'user', content: 'Hi' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Hello — ready?' });
    expect(messages[3]).toEqual({ role: 'user', content: 'I am ready' });
  });

  it('truncateHistory keeps the newest window', () => {
    const history: ChatbotMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
      at: String(i),
    }));
    const truncated = truncateHistory(history, 4);
    expect(truncated).toHaveLength(4);
    expect(truncated[0].content).toBe('m6');
    expect(truncated[3].content).toBe('m9');
  });
});
