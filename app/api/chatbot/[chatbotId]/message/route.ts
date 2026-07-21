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
import { generateChatbotReply } from '@/lib/chatbot/respond';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { isStudentEntitled } from '@/lib/featureFlags';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
});

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
    const body = bodySchema.parse(await req.json());

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
    const reply = await generateChatbotReply({
      professorSystemPrompt: bot.systemPrompt,
      quiz,
      history,
      userMessage: body.message.trim(),
      model: bot.model,
    });

    if (!reply.ok) {
      const status = reply.reason === 'no_api_key' ? 503 : 502;
      return NextResponse.json({ error: reply.message }, { status });
    }

    const now = new Date().toISOString();
    const nextMessages: ChatbotMessage[] = [
      ...history,
      { role: 'user', content: body.message.trim(), at: now },
      { role: 'assistant', content: reply.text, at: now },
    ];

    await db
      .update(chatbotSessions)
      .set({ messages: nextMessages })
      .where(eq(chatbotSessions.id, session.id));

    return NextResponse.json({
      reply: reply.text,
      messages: nextMessages,
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
