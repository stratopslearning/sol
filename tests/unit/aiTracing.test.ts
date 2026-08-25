import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('ai tracing helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.BRAINTRUST_API_KEY;
    delete process.env.BRAINTRUST_SAMPLE_RATE;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isBraintrustEnabled is false without API key', async () => {
    const { isBraintrustEnabled } = await import('@/lib/ai/tracing');
    expect(isBraintrustEnabled()).toBe(false);
  });

  it('buildSafeAiMetadata strips profile and credential fields', async () => {
    const { buildSafeAiMetadata } = await import('@/lib/ai/tracing');
    const safe = buildSafeAiMetadata({
      surface: 'grading',
      clerkId: 'user_abc',
      studentEmail: 'student@school.edu',
      tokenId: 'tok_123',
      score: 4,
      model: 'gpt-5-mini',
    });
    expect(safe).toEqual({
      surface: 'grading',
      score: 4,
      model: 'gpt-5-mini',
    });
  });

  it('hashId returns stable opaque prefix', async () => {
    const { hashId } = await import('@/lib/ai/tracing');
    expect(hashId('question-uuid')).toBe(hashId('question-uuid'));
    expect(hashId('question-uuid')).toHaveLength(16);
    expect(hashId(undefined)).toBeUndefined();
  });

  it('shouldSampleTrace returns false when Braintrust is disabled', async () => {
    const { shouldSampleTrace } = await import('@/lib/ai/tracing');
    expect(shouldSampleTrace({ isFailure: true })).toBe(false);
  });

  it('classifyMcpToolResponse maps protocol outcomes', async () => {
    const { classifyMcpToolResponse } = await import('@/lib/ai/tracing');
    expect(
      classifyMcpToolResponse({
        result: {
          isError: true,
          content: [{ text: 'needs_confirm: archive required' }],
        },
      }),
    ).toBe('needs_confirm');
    expect(
      classifyMcpToolResponse({
        result: {
          isError: true,
          content: [{ text: 'Forbidden: missing scope' }],
        },
      }),
    ).toBe('forbidden_scope');
    expect(
      classifyMcpToolResponse({
        result: { content: [{ text: '{"ok":true}' }] },
      }),
    ).toBe('success');
  });

  it('logAiSpan resolves without calling Braintrust when disabled', async () => {
    const { logAiSpan, shouldSampleTrace } = await import('@/lib/ai/tracing');
    expect(shouldSampleTrace()).toBe(false);
    await expect(
      logAiSpan('test', 'grading', { status: 'graded' }),
    ).resolves.toBeUndefined();
  });
});

describe('createOpenAIClient', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.BRAINTRUST_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-test-dummy';
  });

  it('returns plain OpenAI client when Braintrust is disabled', async () => {
    vi.doMock('openai', () => {
      function OpenAI(this: any) {
        this.chat = { completions: { create: vi.fn() } };
      }
      return { default: OpenAI };
    });
    vi.doMock('braintrust', () => ({
      wrapOpenAI: vi.fn((client: unknown) => client),
      initLogger: vi.fn(),
    }));

    const { createOpenAIClient } = await import('@/lib/ai/openai');
    const { wrapOpenAI } = await import('braintrust');
    const client = createOpenAIClient();
    expect(client).toBeTruthy();
    expect(wrapOpenAI).not.toHaveBeenCalled();
  });
});
