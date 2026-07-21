import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/app/db';
import { chatbotSections, chatbots } from '@/app/db/schema';
import {
  professorCanLinkQuiz,
  professorEnrolledInSections,
} from '@/lib/chatbot/access';
import { CHATBOT_MODEL } from '@/lib/chatbot/constants';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  personaName: z.string().min(1).max(100).default('Professor Emma'),
  instructions: z.string().min(1).max(10_000),
  systemPrompt: z.string().min(1).max(50_000),
  relatedQuizId: z.string().uuid().nullable().optional(),
  sectionIds: z.array(z.string().uuid()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `chatbot-create:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const body = createSchema.parse(await req.json());

    if (user.role === 'PROFESSOR') {
      const ok = await professorEnrolledInSections(user.id, body.sectionIds);
      if (!ok) {
        return NextResponse.json(
          { error: 'You can only assign discussions to sections you teach' },
          { status: 403 },
        );
      }
      if (body.relatedQuizId) {
        const canLink = await professorCanLinkQuiz(user.id, body.relatedQuizId);
        if (!canLink) {
          return NextResponse.json(
            { error: 'You cannot link that quiz' },
            { status: 403 },
          );
        }
      }
    }

    const created = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(chatbots)
        .values({
          professorId: user.id,
          title: body.title,
          description: body.description ?? null,
          personaName: body.personaName,
          instructions: body.instructions,
          systemPrompt: body.systemPrompt,
          relatedQuizId: body.relatedQuizId ?? null,
          isTemplate: false,
          model: CHATBOT_MODEL,
          isActive: true,
        })
        .returning();

      if (body.sectionIds.length > 0) {
        await tx.insert(chatbotSections).values(
          body.sectionIds.map((sectionId) => ({
            chatbotId: bot.id,
            sectionId,
            assignedBy: user.id,
          })),
        );
      }

      return bot;
    });

    return NextResponse.json({
      success: true,
      chatbot: { id: created.id, title: created.title },
    });
  } catch (error) {
    console.error('Chatbot create error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create discussion' },
      { status: 500 },
    );
  }
}
