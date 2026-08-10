import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { chatbotSections, professorSections } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ sectionId: string; chatbotId: string }> },
) {
  let user;
  try {
    ({ user } = await requireProfessorApi(_req, { scope: 'sections:write' }));
  } catch (error) {
    return apiErrorResponse(error);
  }

  const limited = await enforceRateLimit({
    key: `chatbot-unassign:${user.id}`,
    limit: 60,
    windowMs: 60_000,
    prefix: 'rl',
    message: 'Too many unassign requests. Please wait a moment.',
  });
  if (limited) return limited;

  const { sectionId, chatbotId } = await context.params;

  if (user.role === 'PROFESSOR') {
    const enrollment = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.sectionId, sectionId),
        eq(professorSections.professorId, user.id),
      ),
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this section' },
        { status: 403 },
      );
    }
  }

  await db
    .delete(chatbotSections)
    .where(
      and(
        eq(chatbotSections.sectionId, sectionId),
        eq(chatbotSections.chatbotId, chatbotId),
      ),
    );

  return NextResponse.json({ success: true });
}
