import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { chatbotAssignments, chatbotSessions } from '@/app/db/schema';
import { studentCanAccessChatbot } from '@/lib/chatbot/access';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { isStudentEntitled } from '@/lib/featureFlags';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
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
      key: `chatbot-complete:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { chatbotId } = await context.params;
    const body = bodySchema.parse(await readJsonBody(req));

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

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(chatbotSessions)
        .set({ status: 'completed', completedAt: now })
        .where(eq(chatbotSessions.id, session.id));

      await tx
        .update(chatbotAssignments)
        .set({ isCompleted: true, completedAt: now })
        .where(eq(chatbotAssignments.id, session.assignmentId));
    });

    return NextResponse.json({
      success: true,
      messages: session.messages,
    });
  } catch (error) {
    console.error('Chatbot complete error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to complete discussion' },
      { status: 500 },
    );
  }
}
