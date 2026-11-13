import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbotAssignments,
  chatbotSessions,
  type ChatbotMessage,
} from '@/app/db/schema';
import {
  getStudentAccessSectionIds,
  studentCanAccessChatbot,
} from '@/lib/chatbot/access';
import { fetchChatbotByIdDefiner } from '@/lib/db/studentReadDefiners';

export type StudentChatbotPageData = {
  session: {
    id: string;
    status: 'in_progress' | 'completed';
    messages: ChatbotMessage[];
    isCompleted: boolean;
  };
  chatbot: {
    id: string;
    title: string;
    description: string | null;
    personaName: string;
    instructions: string;
    relatedQuizId: string | null;
    learningMode: boolean;
  };
};

/** Access check (enrollment ∩ assignment) via DEFINER helpers. */
export async function studentHasChatbotAccess(
  studentId: string,
  chatbotId: string,
): Promise<boolean> {
  return studentCanAccessChatbot(studentId, chatbotId);
}

/**
 * Load everything the chat UI needs in one server round.
 * Prefer `sessionId` for reviews; otherwise resume in-progress or latest completed.
 */
export async function loadStudentChatbotPageData(opts: {
  studentId: string;
  chatbotId: string;
  sessionId?: string;
}): Promise<StudentChatbotPageData | null> {
  const bot = await fetchChatbotByIdDefiner(opts.chatbotId);
  if (!bot || !bot.isActive || bot.isTemplate) return null;

  const canAccess = await studentHasChatbotAccess(opts.studentId, opts.chatbotId);
  if (!canAccess) return null;

  let assignment = await db.query.chatbotAssignments.findFirst({
    where: and(
      eq(chatbotAssignments.chatbotId, opts.chatbotId),
      eq(chatbotAssignments.studentId, opts.studentId),
    ),
  });

  if (!assignment) {
    const [created] = await db
      .insert(chatbotAssignments)
      .values({
        chatbotId: opts.chatbotId,
        studentId: opts.studentId,
      })
      .returning();
    assignment = created;
  }

  let session = null as
    | typeof chatbotSessions.$inferSelect
    | null
    | undefined;

  if (opts.sessionId) {
    session = await db.query.chatbotSessions.findFirst({
      where: and(
        eq(chatbotSessions.id, opts.sessionId),
        eq(chatbotSessions.chatbotId, opts.chatbotId),
        eq(chatbotSessions.studentId, opts.studentId),
      ),
    });
    if (!session) return null;
  } else {
    session = await db.query.chatbotSessions.findFirst({
      where: and(
        eq(chatbotSessions.assignmentId, assignment.id),
        eq(chatbotSessions.status, 'in_progress'),
      ),
    });

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
      const accessSections = await getStudentAccessSectionIds(
        opts.studentId,
        opts.chatbotId,
      );
      const sectionId = accessSections[0];
      if (!sectionId) return null;

      const [created] = await db
        .insert(chatbotSessions)
        .values({
          assignmentId: assignment.id,
          studentId: opts.studentId,
          chatbotId: opts.chatbotId,
          sectionId,
          messages: [] as ChatbotMessage[],
          status: 'in_progress',
        })
        .returning();
      session = created;
    }
  }

  const messages = Array.isArray(session.messages)
    ? (session.messages as ChatbotMessage[])
    : [];

  return {
    session: {
      id: session.id,
      status: session.status as 'in_progress' | 'completed',
      messages,
      isCompleted: assignment.isCompleted || session.status === 'completed',
    },
    chatbot: {
      id: bot.id,
      title: bot.title,
      description: bot.description,
      personaName: bot.personaName,
      instructions: bot.instructions,
      relatedQuizId: bot.relatedQuizId,
      learningMode: Boolean(bot.relatedQuizId),
    },
  };
}
