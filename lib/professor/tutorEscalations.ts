import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import { chatbotSessions, professorSections } from '@/app/db/schema';

export type TutorEscalationItem = {
  sessionId: string;
  chatbotId: string;
  chatbotTitle: string;
  sectionId: string;
  sectionName: string;
  courseTitle: string | null;
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  escalatedAt: string | null;
  preview: string | null;
};

function sessionIsEscalated(meta: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  if (meta.escalated === true) return true;
  if (meta.instructorEscalationRequested === true) return true;
  return false;
}

function escalatedAtFromMeta(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const at = meta.instructorEscalationAt ?? meta.escalatedAt;
  return typeof at === 'string' ? at : null;
}

export async function listTutorEscalationsForProfessor(
  professorId: string,
  options: { limit?: number } = {},
): Promise<TutorEscalationItem[]> {
  const { listTeachingSectionIds } = await import(
    '@/lib/professor/graderSections'
  );
  const sectionIds = await listTeachingSectionIds({ id: professorId });
  if (sectionIds.length === 0) return [];

  const limit = Math.max(1, Math.min(options.limit ?? 100, 300));

  const rows = await db.query.chatbotSessions.findMany({
    where: and(
      inArray(chatbotSessions.sectionId, sectionIds),
      or(
        sql`${chatbotSessions.sessionMetadata}->>'escalated' = 'true'`,
        sql`${chatbotSessions.sessionMetadata}->>'instructorEscalationRequested' = 'true'`,
      ),
    ),
    with: {
      student: true,
      chatbot: { columns: { id: true, title: true } },
      section: { with: { course: { columns: { title: true } } } },
    },
    orderBy: (t, { desc }) => [desc(t.startedAt)],
    limit,
  });

  return rows
    .filter((row) =>
      sessionIsEscalated(row.sessionMetadata as Record<string, unknown>),
    )
    .map((row) => {
      const messages = row.messages ?? [];
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      return {
        sessionId: row.id,
        chatbotId: row.chatbotId,
        chatbotTitle: row.chatbot?.title ?? 'Discussion',
        sectionId: row.sectionId,
        sectionName: row.section.name,
        courseTitle: row.section.course?.title ?? null,
        student: {
          id: row.student.id,
          firstName: row.student.firstName,
          lastName: row.student.lastName,
          email: row.student.email,
        },
        escalatedAt: escalatedAtFromMeta(
          row.sessionMetadata as Record<string, unknown>,
        ),
        preview: lastUser?.content?.slice(0, 240) ?? null,
      };
    });
}
