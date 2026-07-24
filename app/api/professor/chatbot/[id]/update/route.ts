import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { chatbotSections, chatbots } from '@/app/db/schema';
import {
  getActiveChatbot,
  professorCanLinkQuiz,
  professorEnrolledInSections,
} from '@/lib/chatbot/access';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  personaName: z.string().min(1).max(100).optional(),
  instructions: z.string().min(1).max(10_000).optional(),
  systemPrompt: z.string().min(1).max(50_000).optional(),
  relatedQuizId: z.string().uuid().nullable().optional(),
  sectionIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `chatbot-update:${user.id}`,
      limit: 40,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many update requests. Please wait a moment.',
    });
    if (limited) return limited;

    const { id } = await context.params;
    const bot = await getActiveChatbot(id);
    if (!bot || bot.isTemplate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (user.role === 'PROFESSOR' && bot.professorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = updateSchema.parse(await req.json());

    if (body.sectionIds && user.role === 'PROFESSOR') {
      const ok = await professorEnrolledInSections(user.id, body.sectionIds);
      if (!ok) {
        return NextResponse.json(
          { error: 'You can only assign discussions to sections you teach' },
          { status: 403 },
        );
      }
    }

    if (body.relatedQuizId && user.role === 'PROFESSOR') {
      const canLink = await professorCanLinkQuiz(user.id, body.relatedQuizId);
      if (!canLink) {
        return NextResponse.json(
          { error: 'You cannot link that quiz' },
          { status: 403 },
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(chatbots)
        .set({
          ...(body.title != null ? { title: body.title } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.personaName != null ? { personaName: body.personaName } : {}),
          ...(body.instructions != null
            ? { instructions: body.instructions }
            : {}),
          ...(body.systemPrompt != null
            ? { systemPrompt: body.systemPrompt }
            : {}),
          ...(body.relatedQuizId !== undefined
            ? { relatedQuizId: body.relatedQuizId }
            : {}),
          ...(body.isActive != null ? { isActive: body.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(chatbots.id, id));

      if (body.sectionIds) {
        await tx
          .delete(chatbotSections)
          .where(eq(chatbotSections.chatbotId, id));
        if (body.sectionIds.length > 0) {
          await tx.insert(chatbotSections).values(
            body.sectionIds.map((sectionId) => ({
              chatbotId: id,
              sectionId,
              assignedBy: user.id,
            })),
          );
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chatbot update error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to update discussion' },
      { status: 500 },
    );
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateUser();
  if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const bot = await db.query.chatbots.findFirst({
    where: and(eq(chatbots.id, id)),
    with: { sectionAssignments: true, relatedQuiz: true },
  });
  if (!bot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (
    user.role === 'PROFESSOR' &&
    !bot.isTemplate &&
    bot.professorId !== user.id
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    chatbot: {
      id: bot.id,
      title: bot.title,
      description: bot.description,
      personaName: bot.personaName,
      instructions: bot.instructions,
      systemPrompt: bot.systemPrompt,
      relatedQuizId: bot.relatedQuizId,
      relatedQuizTitle: bot.relatedQuiz?.title ?? null,
      isTemplate: bot.isTemplate,
      sectionIds: bot.sectionAssignments.map((s) => s.sectionId),
    },
  });
}
