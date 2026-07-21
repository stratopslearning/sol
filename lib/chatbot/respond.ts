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

  const safeQuiz = buildSafeQuizContext(opts.quiz);
  const systemContent = assembleSystemPrompt(
    opts.professorSystemPrompt,
    safeQuiz,
  );
  const messages = toOpenAiMessages(
    systemContent,
    opts.history,
    opts.userMessage,
  );

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
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout =
      /timeout|timed out|AbortError/i.test(message) ||
      (err as { code?: string })?.code === 'ETIMEDOUT';
    return {
      ok: false,
      reason: isTimeout ? 'openai_timeout' : 'openai_error',
      message: isTimeout
        ? 'The assistant timed out. Please try again.'
        : 'The assistant failed to respond. Please try again.',
    };
  }
}
