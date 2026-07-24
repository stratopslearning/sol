import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/app/db';
import { chatbotSections } from '@/app/db/schema';
import {
  getActiveChatbot,
  professorEnrolledInSections,
} from '@/lib/chatbot/access';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';

export const dynamic = 'force-dynamic';

const assignSchema = z.object({
  sectionIds: z.array(z.string().uuid()).min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `chatbot-assign:${user.id}`,
      limit: 40,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many assign requests. Please wait a moment.',
    });
    if (limited) return limited;

    const { id } = await context.params;
    const bot = await getActiveChatbot(id);
    if (!bot || bot.isTemplate) {
      return NextResponse.json(
        { error: 'Duplicate the template before assigning' },
        { status: 400 },
      );
    }
    if (user.role === 'PROFESSOR' && bot.professorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = assignSchema.parse(await req.json());
    if (user.role === 'PROFESSOR') {
      const ok = await professorEnrolledInSections(user.id, body.sectionIds);
      if (!ok) {
        return NextResponse.json(
          { error: 'You can only assign to sections you teach' },
          { status: 403 },
        );
      }
    }

    await db
      .insert(chatbotSections)
      .values(
        body.sectionIds.map((sectionId) => ({
          chatbotId: id,
          sectionId,
          assignedBy: user.id,
        })),
      )
      .onConflictDoNothing({
        target: [chatbotSections.chatbotId, chatbotSections.sectionId],
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chatbot assign error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Failed to assign' }, { status: 500 });
  }
}
