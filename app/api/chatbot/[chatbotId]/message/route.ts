import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  chatbotSessions,
  type ChatbotMessage,
} from '@/app/db/schema';
import {
  getActiveChatbot,
  loadSafeQuizForChatbot,
  studentCanAccessChatbot,
} from '@/lib/chatbot/access';
import {
  MAX_SESSION_TURNS,
  MAX_USER_MESSAGE_CHARS,
} from '@/lib/chatbot/constants';
import { streamChatbotReply, scrubAssistantReply } from '@/lib/chatbot/respond';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { sanitizeStoredText } from '@/lib/api/sanitizeStoredText';
import { isStudentEntitled } from '@/lib/featureFlags';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
});

type SseEvent =
  | { type: 'token'; text: string }
  | { type: 'done'; reply: string; messages: ChatbotMessage[] }
  | { type: 'error'; message: string };

function encodeSse(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chatbotId: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isStudentEntitled(user)) {
      return NextResponse.json({ error: 'Payment required' }, { status: 402 });
    }

    const limited = await enforceRateLimit({
      key: `chatbot-msg:${user.id}`,
      limit: 40,
      windowMs: 5 * 60_000,
      prefix: 'rl',
      message: 'Too many chat messages. Please wait a moment.',
    });
    if (limited) return limited;

    const { chatbotId } = await context.params;
    const body = bodySchema.parse(await readJsonBody(req));

    const bot = await getActiveChatbot(chatbotId);
    if (!bot || bot.isTemplate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const canAccess = await studentCanAccessChatbot(user.id, chatbotId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const session = await db.query.chatbotSessions.findFirst({
      where: and(
        eq(chatbotSessions.id, body.sessionId),
        eq(chatbotSessions.chatbotId, chatbotId),
        eq(chatbotSessions.studentId, user.id),
      ),
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'This discussion is already completed' },
        { status: 400 },
      );
    }

    const history = (session.messages ?? []) as ChatbotMessage[];
    const userTurns = history.filter((m) => m.role === 'user').length;
    if (userTurns >= MAX_SESSION_TURNS) {
      return NextResponse.json(
        {
          error:
            'This discussion has reached the maximum number of turns. Please complete it.',
        },
        { status: 400 },
      );
    }

    const quiz = await loadSafeQuizForChatbot(bot.relatedQuizId);
    const userText = sanitizeStoredText(body.message);
    const streamed = await streamChatbotReply({
      professorSystemPrompt: bot.systemPrompt,
      quiz,
      history,
      userMessage: userText,
      model: bot.model,
    });

    if (!streamed.ok) {
      const status = streamed.reason === 'no_api_key' ? 503 : 502;
      return NextResponse.json({ error: streamed.message }, { status });
    }

    const encoder = new TextEncoder();
    const openaiStream = streamed.stream;
    const sessionId = session.id;

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = '';
        try {
          for await (const piece of openaiStream) {
            full += piece;
            controller.enqueue(
              encoder.encode(encodeSse({ type: 'token', text: piece })),
            );
          }

          const rawReply = full.trim();
          if (!rawReply) {
            controller.enqueue(
              encoder.encode(
                encodeSse({
                  type: 'error',
                  message:
                    'The assistant returned an empty reply. Please try again.',
                }),
              ),
            );
            controller.close();
            return;
          }

          // Post-stream leak scrub: persist + done use the safe reply even if
          // progressive tokens already streamed (client should prefer `done`).
          const reply = scrubAssistantReply(rawReply);

          const now = new Date().toISOString();
          const nextMessages: ChatbotMessage[] = [
            ...history,
            { role: 'user', content: userText, at: now },
            { role: 'assistant', content: reply, at: now },
          ];

          await db
            .update(chatbotSessions)
            .set({ messages: nextMessages })
            .where(eq(chatbotSessions.id, sessionId));

          controller.enqueue(
            encoder.encode(
              encodeSse({
                type: 'done',
                reply,
                messages: nextMessages,
              }),
            ),
          );
          controller.close();
        } catch (err) {
          console.error('Chatbot stream error:', err);
          controller.enqueue(
            encoder.encode(
              encodeSse({
                type: 'error',
                message: 'The assistant failed to respond. Please try again.',
              }),
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Chatbot message error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 },
    );
  }
}
