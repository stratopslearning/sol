import type { ChatbotMessage } from '@/app/db/schema';
import { chatbotOpenAI, CHATBOT_MODEL } from '@/lib/chatbot/client';
import {
  assembleSystemPrompt,
  buildSafeQuizContext,
  toOpenAiMessages,
  type SafeQuizInput,
} from '@/lib/chatbot/safeQuizContext';

export type ChatbotRespondResult =
  | { ok: true; text: string }
  | {
      ok: false;
      reason: 'no_api_key' | 'empty_response' | 'openai_timeout' | 'openai_error';
      message: string;
    };

export type ChatbotStreamResult =
  | {
      ok: true;
      stream: AsyncIterable<string>;
    }
  | {
      ok: false;
      reason: 'no_api_key' | 'openai_timeout' | 'openai_error';
      message: string;
    };

function buildMessages(opts: {
  professorSystemPrompt: string;
  quiz: SafeQuizInput | null;
  history: ChatbotMessage[];
  userMessage: string;
}) {
  const safeQuiz = buildSafeQuizContext(opts.quiz);
  const systemContent = assembleSystemPrompt(
    opts.professorSystemPrompt,
    safeQuiz,
  );
  return toOpenAiMessages(systemContent, opts.history, opts.userMessage);
}

function mapOpenAiError(err: unknown): {
  reason: 'openai_timeout' | 'openai_error';
  message: string;
} {
  const message = err instanceof Error ? err.message : 'Unknown error';
  const isTimeout =
    /timeout|timed out|AbortError/i.test(message) ||
    (err as { code?: string })?.code === 'ETIMEDOUT';
  return {
    reason: isTimeout ? 'openai_timeout' : 'openai_error',
    message: isTimeout
      ? 'The assistant timed out. Please try again.'
      : 'The assistant failed to respond. Please try again.',
  };
}

/** Non-streaming reply (kept for tests / fallbacks). */
export async function generateChatbotReply(opts: {
  professorSystemPrompt: string;
  quiz: SafeQuizInput | null;
  history: ChatbotMessage[];
  userMessage: string;
  model?: string;
}): Promise<ChatbotRespondResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      reason: 'no_api_key',
      message: 'Chat is temporarily unavailable (missing API key).',
    };
  }

  const messages = buildMessages(opts);

  try {
    const completion = await chatbotOpenAI.chat.completions.create({
      model: opts.model ?? CHATBOT_MODEL,
      temperature: 0.5,
      max_completion_tokens: 800,
      messages,
    } as never);

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return {
        ok: false,
        reason: 'empty_response',
        message: 'The assistant returned an empty reply. Please try again.',
      };
    }
    return { ok: true, text };
  } catch (err: unknown) {
    const mapped = mapOpenAiError(err);
    return { ok: false, ...mapped };
  }
}

/** Streaming reply — yields text deltas as they arrive from OpenAI. */
export async function streamChatbotReply(opts: {
  professorSystemPrompt: string;
  quiz: SafeQuizInput | null;
  history: ChatbotMessage[];
  userMessage: string;
  model?: string;
}): Promise<ChatbotStreamResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      reason: 'no_api_key',
      message: 'Chat is temporarily unavailable (missing API key).',
    };
  }

  const messages = buildMessages(opts);

  try {
    const completion = await chatbotOpenAI.chat.completions.create({
      model: opts.model ?? CHATBOT_MODEL,
      temperature: 0.5,
      max_completion_tokens: 800,
      messages,
      stream: true,
    } as never);

    // `as never` above keeps create() loosely typed; stream:true yields chunks.
    const stream = completion as unknown as AsyncIterable<{
      choices?: Array<{ delta?: { content?: string | null } }>;
    }>;

    async function* deltas(): AsyncIterable<string> {
      for await (const chunk of stream) {
        const piece = chunk.choices?.[0]?.delta?.content;
        if (piece) yield piece;
      }
    }

    return { ok: true, stream: deltas() };
  } catch (err: unknown) {
    const mapped = mapOpenAiError(err);
    return { ok: false, ...mapped };
  }
}
