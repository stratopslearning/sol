import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { chatbotSessions, professorSections } from '@/app/db/schema';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const user = await getOrCreateUser();
  if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const session = await db.query.chatbotSessions.findFirst({
    where: eq(chatbotSessions.id, sessionId),
    with: {
      student: true,
      section: true,
      chatbot: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (user.role === 'PROFESSOR') {
    const owns = session.chatbot.professorId === user.id;
    const teaches = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.professorId, user.id),
        eq(professorSections.sectionId, session.sectionId),
      ),
    });
    if (!owns && !teaches) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      messages: session.messages,
      studentName:
        [session.student.firstName, session.student.lastName]
          .filter(Boolean)
          .join(' ') || session.student.email,
      sectionName: session.section.name,
      chatbotTitle: session.chatbot.title,
      personaName: session.chatbot.personaName,
    },
  });
}
