import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { chatbots } from '@/app/db/schema';
import { getActiveChatbot } from '@/lib/chatbot/access';
import { CHATBOT_MODEL } from '@/lib/chatbot/constants';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `chatbot-dup:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { id } = await context.params;
    const source = await getActiveChatbot(id);
    if (!source) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (
      user.role === 'PROFESSOR' &&
      !source.isTemplate &&
      source.professorId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [created] = await db
      .insert(chatbots)
      .values({
        professorId: user.id,
        title: source.isTemplate ? source.title : `${source.title} (copy)`,
        description: source.description,
        personaName: source.personaName,
        instructions: source.instructions,
        systemPrompt: source.systemPrompt,
        relatedQuizId: source.relatedQuizId,
        isTemplate: false,
        model: source.model || CHATBOT_MODEL,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      chatbot: { id: created.id, title: created.title },
    });
  } catch (error) {
    console.error('Chatbot duplicate error:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate discussion' },
      { status: 500 },
    );
  }
}
