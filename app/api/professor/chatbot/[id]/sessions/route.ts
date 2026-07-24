import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbotSections,
  chatbotSessions,
  professorSections,
} from '@/app/db/schema';
import { getActiveChatbot } from '@/lib/chatbot/access';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateUser();
  if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const bot = await getActiveChatbot(id);
  if (!bot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (user.role === 'PROFESSOR' && bot.professorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let sectionFilter: string[] | null = null;
  if (user.role === 'PROFESSOR') {
    const taught = await db.query.professorSections.findMany({
      where: eq(professorSections.professorId, user.id),
    });
    sectionFilter = taught.map((t) => t.sectionId);
  }

  const assigned = await db.query.chatbotSections.findMany({
    where: eq(chatbotSections.chatbotId, id),
  });
  const assignedIds = assigned.map((a) => a.sectionId);
  const allowedSections =
    sectionFilter == null
      ? assignedIds
      : assignedIds.filter((sid) => sectionFilter!.includes(sid));

  if (allowedSections.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  const sessions = await db.query.chatbotSessions.findMany({
    where: and(
      eq(chatbotSessions.chatbotId, id),
      eq(chatbotSessions.status, 'completed'),
      inArray(chatbotSessions.sectionId, allowedSections),
    ),
    with: {
      student: true,
      section: true,
    },
    orderBy: [desc(chatbotSessions.completedAt)],
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      studentName:
        [s.student.firstName, s.student.lastName].filter(Boolean).join(' ') ||
        s.student.email,
      studentEmail: s.student.email,
      sectionName: s.section.name,
      completedAt: s.completedAt,
      messageCount: Array.isArray(s.messages) ? s.messages.length : 0,
    })),
  });
}
