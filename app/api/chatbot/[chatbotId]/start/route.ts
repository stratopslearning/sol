import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbotAssignments,
  chatbotSessions,
  type ChatbotMessage,
} from '@/app/db/schema';
import {
  getActiveChatbot,
  getStudentAccessSectionIds,
} from '@/lib/chatbot/access';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { isStudentEntitled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

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
      key: `chatbot-start:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { chatbotId } = await context.params;
    const body = await req.json().catch(() => ({} as { sessionId?: string }));
    const requestedSessionId =
      typeof body?.sessionId === 'string' ? body.sessionId : undefined;

    const bot = await getActiveChatbot(chatbotId);
    if (!bot || bot.isTemplate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const accessSections = await getStudentAccessSectionIds(user.id, chatbotId);
    if (accessSections.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sectionId = accessSections[0];

    let assignment = await db.query.chatbotAssignments.findFirst({
      where: and(
        eq(chatbotAssignments.chatbotId, chatbotId),
        eq(chatbotAssignments.studentId, user.id),
      ),
    });

    if (!assignment) {
      const [created] = await db
        .insert(chatbotAssignments)
        .values({
          chatbotId,
          studentId: user.id,
        })
        .returning();
      assignment = created;
    }

    // Explicit review of a known session (must belong to this student + bot).
    if (requestedSessionId) {
      const requested = await db.query.chatbotSessions.findFirst({
        where: and(
          eq(chatbotSessions.id, requestedSessionId),
          eq(chatbotSessions.chatbotId, chatbotId),
          eq(chatbotSessions.studentId, user.id),
        ),
      });
      if (!requested) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({
        session: {
          id: requested.id,
          assignmentId: assignment.id,
          status: requested.status,
          messages: requested.messages ?? [],
          isCompleted:
            assignment.isCompleted || requested.status === 'completed',
        },
        chatbot: serializeBot(bot),
      });
    }

    // Resume in-progress if any.
    let session = await db.query.chatbotSessions.findFirst({
      where: and(
        eq(chatbotSessions.assignmentId, assignment.id),
        eq(chatbotSessions.status, 'in_progress'),
      ),
    });

    // Review path: assignment already completed — return latest completed
    // transcript instead of opening a blank new session.
    if (!session && assignment.isCompleted) {
      session = await db.query.chatbotSessions.findFirst({
        where: and(
          eq(chatbotSessions.assignmentId, assignment.id),
          eq(chatbotSessions.status, 'completed'),
        ),
        orderBy: [desc(chatbotSessions.completedAt)],
      });
    }

    if (!session) {
      const [created] = await db
        .insert(chatbotSessions)
        .values({
          assignmentId: assignment.id,
          studentId: user.id,
          chatbotId,
          sectionId,
          messages: [] as ChatbotMessage[],
          status: 'in_progress',
        })
        .returning();
      session = created;
    }

    return NextResponse.json({
      session: {
        id: session.id,
        assignmentId: assignment.id,
        status: session.status,
        messages: session.messages ?? [],
        isCompleted:
          assignment.isCompleted || session.status === 'completed',
      },
      chatbot: serializeBot(bot),
    });
  } catch (error) {
    console.error('Chatbot start error:', error);
    return NextResponse.json(
      { error: 'Failed to start discussion' },
      { status: 500 },
    );
  }
}

function serializeBot(bot: {
  id: string;
  title: string;
  description: string | null;
  personaName: string;
  instructions: string;
  relatedQuizId: string | null;
}) {
  return {
    id: bot.id,
    title: bot.title,
    description: bot.description,
    personaName: bot.personaName,
    instructions: bot.instructions,
    relatedQuizId: bot.relatedQuizId,
    learningMode: Boolean(bot.relatedQuizId),
  };
}
