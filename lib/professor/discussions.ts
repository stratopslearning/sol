/**
 * Professor discussion (chatbot) reads, shared by the REST API and MCP tools.
 * Access via role_bindings (content.write / tutor.transcripts.read).
 */
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbotSections,
  chatbotSessions,
  chatbots,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { authorizeOnSection } from '@/lib/authz/courseAccess';
import { logAudit } from '@/lib/audit';
import {
  getActiveChatbot,
  userCanWriteChatbot,
} from '@/lib/chatbot/access';
import type { UserData } from '@/lib/getOrCreateUser';

type ProfessorUser = Pick<UserData, 'id' | 'platformStaff' | 'clerkId'> & {
  platformStaff?: boolean;
};

export type DiscussionSummary = {
  id: string;
  title: string;
  personaName: string;
  description: string | null;
  isTemplate: boolean;
  isActive: boolean;
  ownedByMe: boolean;
  relatedQuiz: { id: string; title: string } | null;
  sections: { id: string; name: string }[];
  updatedAt: Date;
};

export async function listProfessorDiscussions(
  user: ProfessorUser,
): Promise<DiscussionSummary[]> {
  const rows = await db.query.chatbots.findMany({
    where: and(
      isNull(chatbots.deletedAt),
      or(eq(chatbots.professorId, user.id), eq(chatbots.isTemplate, true)),
    ),
    with: {
      relatedQuiz: { columns: { id: true, title: true } },
      sectionAssignments: { with: { section: true } },
    },
    orderBy: (t, { desc: d }) => [d(t.updatedAt)],
  });

  return rows.map((bot) => {
    const authorId = bot.professorId;
    return {
    id: bot.id,
    title: bot.title,
    personaName: bot.personaName,
    description: bot.description,
    isTemplate: bot.isTemplate,
    isActive: bot.isActive,
    ownedByMe: Boolean(authorId && authorId === user.id),
    relatedQuiz: bot.relatedQuiz
      ? { id: bot.relatedQuiz.id, title: bot.relatedQuiz.title }
      : null,
    sections: (bot.sectionAssignments ?? [])
      .filter((sa) => sa.section != null)
      .map((sa) => ({ id: sa.section.id, name: sa.section.name })),
    updatedAt: bot.updatedAt,
  };
  });
}

export type DiscussionDetail = DiscussionSummary & {
  instructions: string;
  systemPrompt: string;
  model: string;
};

/** Teaching staff with content.write (or template): includes instructions. */
export async function getProfessorDiscussion(
  user: ProfessorUser,
  chatbotId: string,
): Promise<DiscussionDetail> {
  const bot = await db.query.chatbots.findFirst({
    where: and(eq(chatbots.id, chatbotId), isNull(chatbots.deletedAt)),
    with: {
      relatedQuiz: { columns: { id: true, title: true } },
      sectionAssignments: { with: { section: true } },
    },
  });
  if (!bot) throw ApiError.notFound('Discussion not found');

  const authorId = bot.professorId;
  const isOwner = Boolean(authorId && authorId === user.id);
  if (!bot.isTemplate && !(await userCanWriteChatbot(user, bot))) {
    throw ApiError.forbidden('You do not have access to this discussion');
  }

  return {
    id: bot.id,
    title: bot.title,
    personaName: bot.personaName,
    description: bot.description,
    isTemplate: bot.isTemplate,
    isActive: bot.isActive,
    ownedByMe: isOwner,
    relatedQuiz: bot.relatedQuiz
      ? { id: bot.relatedQuiz.id, title: bot.relatedQuiz.title }
      : null,
    sections: (bot.sectionAssignments ?? [])
      .filter((sa) => sa.section != null)
      .map((sa) => ({ id: sa.section.id, name: sa.section.name })),
    instructions: bot.instructions,
    systemPrompt: bot.systemPrompt,
    model: bot.model,
    updatedAt: bot.updatedAt,
  };
}

export type DiscussionSessionSummary = {
  id: string;
  studentName: string;
  studentEmail: string | null;
  sectionName: string;
  completedAt: Date | null;
  messageCount: number;
};

/** Completed sessions for a bot, scoped to sections the caller can read transcripts for. */
export async function listDiscussionSessions(
  user: ProfessorUser,
  chatbotId: string,
): Promise<DiscussionSessionSummary[]> {
  const bot = await getActiveChatbot(chatbotId);
  if (!bot) throw ApiError.notFound('Discussion not found');
  if (!(await userCanWriteChatbot(user, bot))) {
    throw ApiError.forbidden('You do not have access to this discussion');
  }

  const assigned = await db.query.chatbotSections.findMany({
    where: eq(chatbotSections.chatbotId, chatbotId),
  });
  const allowedSections: string[] = [];
  for (const a of assigned) {
    if (
      (await authorizeOnSection(user, 'tutor.transcripts.read', a.sectionId)) ||
      (await authorizeOnSection(user, 'content.write', a.sectionId))
    ) {
      allowedSections.push(a.sectionId);
    }
  }

  if (allowedSections.length === 0) return [];

  const sessions = await db.query.chatbotSessions.findMany({
    where: and(
      eq(chatbotSessions.chatbotId, chatbotId),
      eq(chatbotSessions.status, 'completed'),
      inArray(chatbotSessions.sectionId, allowedSections),
    ),
    with: { student: true, section: true },
    orderBy: [desc(chatbotSessions.completedAt)],
  });

  return sessions.map((s) => ({
    id: s.id,
    studentName:
      [s.student.firstName, s.student.lastName].filter(Boolean).join(' ') ||
      s.student.email,
    studentEmail: s.student.email,
    sectionName: s.section.name,
    completedAt: s.completedAt,
    messageCount: Array.isArray(s.messages) ? s.messages.length : 0,
  }));
}

export type DiscussionSessionDetail = {
  id: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  messages: unknown;
  studentName: string;
  sectionName: string;
  chatbotTitle: string;
  personaName: string;
};

/** Full transcript: an education-record disclosure, so it is audited. */
export async function getDiscussionSession(
  user: ProfessorUser,
  sessionId: string,
): Promise<DiscussionSessionDetail> {
  const session = await db.query.chatbotSessions.findFirst({
    where: eq(chatbotSessions.id, sessionId),
    with: { student: true, section: true, chatbot: true },
  });
  if (!session) throw ApiError.notFound('Session not found');

  const canRead =
    (await authorizeOnSection(
      user,
      'tutor.transcripts.read',
      session.sectionId,
    )) ||
    (await authorizeOnSection(user, 'content.write', session.sectionId)) ||
    (await userCanWriteChatbot(user, session.chatbot));
  if (!canRead) {
    throw ApiError.forbidden('You do not have access to this session');
  }

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'education.discussion_session.view',
    targetType: 'chatbot_session',
    targetId: sessionId,
    metadata: { via: 'bindings' },
  });

  return {
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
  };
}
