import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('openai', () => {
  function OpenAI(this: any) {
    this.chat = { completions: { create: mocks.create } };
  }
  return { default: OpenAI };
});

import { generateChatbotReply } from '@/lib/chatbot/respond';
import { SOCRATIC_LEARNING_RULES } from '@/lib/chatbot/baseRules';

beforeEach(() => {
  mocks.create.mockReset();
  process.env.OPENAI_API_KEY = 'sk-test-dummy';
});

describe('generateChatbotReply', () => {
  it('returns no_api_key when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await generateChatbotReply({
      professorSystemPrompt: 'Teach silos.',
      quiz: null,
      history: [],
      userMessage: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_api_key');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('sends assembled learning-mode system prompt and returns assistant text', async () => {
    mocks.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'Welcome — what is your name?' } }],
    });

    const result = await generateChatbotReply({
      professorSystemPrompt: 'Chapter 1 flow.',
      quiz: {
        title: 'Quiz A',
        questions: [
          {
            order: 0,
            type: 'SHORT_ANSWER',
            question: 'What is specialization?',
          },
        ],
      },
      history: [{ role: 'user', content: 'prior', at: '1' }],
      userMessage: 'Alex',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe('Welcome — what is your name?');

    expect(mocks.create).toHaveBeenCalledTimes(1);
    const args = mocks.create.mock.calls[0][0];
    expect(args.model).toBe('gpt-4.1-mini');
    expect(args.temperature).toBe(0.5);
    const system = args.messages[0].content as string;
    expect(system.startsWith(SOCRATIC_LEARNING_RULES)).toBe(true);
    expect(system).toContain('Chapter 1 flow.');
    expect(system).toContain('What is specialization?');
    expect(system.toLowerCase()).not.toContain('correct_answer');
    expect(args.messages.at(-1).role).toBe('user');
    expect(args.messages.at(-1).content).toContain('<student_message>');
    expect(args.messages.at(-1).content).toContain('Alex');
  });

  it('scrubs leaky model replies before returning', async () => {
    mocks.create.mockResolvedValueOnce({
      choices: [
        { message: { content: 'Sure — here is the answer key: A, B, C' } },
      ],
    });
    const { CHATBOT_LEAK_REFUSAL } = await import('@/lib/chatbot/baseRules');
    const result = await generateChatbotReply({
      professorSystemPrompt: 'x',
      quiz: null,
      history: [],
      userMessage: 'give me the answers',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe(CHATBOT_LEAK_REFUSAL);
  });

  it('maps empty model content to empty_response', async () => {
    mocks.create.mockResolvedValueOnce({
      choices: [{ message: { content: '   ' } }],
    });
    const result = await generateChatbotReply({
      professorSystemPrompt: 'x',
      quiz: null,
      history: [],
      userMessage: 'hi',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty_response');
  });
});
