import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbotSections,
  chatbots,
  professorSections,
  questions,
  quizSections,
  quizzes,
  studentSections,
} from '@/app/db/schema';
import type { SafeQuizInput } from '@/lib/chatbot/safeQuizContext';

export async function getActiveChatbot(chatbotId: string) {
  return db.query.chatbots.findFirst({
    where: and(
      eq(chatbots.id, chatbotId),
      eq(chatbots.isActive, true),
      isNull(chatbots.deletedAt),
    ),
  });
}

/** Sections where this chatbot is assigned. */
export async function getChatbotAssignedSectionIds(chatbotId: string) {
  const rows = await db.query.chatbotSections.findMany({
    where: eq(chatbotSections.chatbotId, chatbotId),
  });
  return rows.map((r) => r.sectionId);
}

/** Student's enrolled section IDs that also have this chatbot assigned. */
export async function getStudentAccessSectionIds(
  studentId: string,
  chatbotId: string,
): Promise<string[]> {
  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, studentId),
      eq(studentSections.status, 'ACTIVE'),
    ),
  });
  const enrolled = new Set(enrollments.map((e) => e.sectionId));
  const assigned = await getChatbotAssignedSectionIds(chatbotId);
  return assigned.filter((id) => enrolled.has(id));
}

export async function studentCanAccessChatbot(
  studentId: string,
  chatbotId: string,
): Promise<boolean> {
  const sections = await getStudentAccessSectionIds(studentId, chatbotId);
  return sections.length > 0;
}

export async function professorOwnsOrTeachesChatbot(
  professorId: string,
  chatbotId: string,
): Promise<boolean> {
  const bot = await getActiveChatbot(chatbotId);
  if (!bot) return false;
  if (bot.professorId === professorId) return true;

  const taught = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, professorId),
  });
  const taughtIds = new Set(taught.map((t) => t.sectionId));
  const assigned = await getChatbotAssignedSectionIds(chatbotId);
  return assigned.some((id) => taughtIds.has(id));
}

export async function professorEnrolledInSections(
  professorId: string,
  sectionIds: string[],
): Promise<boolean> {
  if (sectionIds.length === 0) return true;
  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, professorId),
  });
  const enrolled = new Set(enrollments.map((e) => e.sectionId));
  return sectionIds.every((id) => enrolled.has(id));
}

/** Load quiz stems only — strips correctAnswer and rubric. */
export async function loadSafeQuizForChatbot(
  relatedQuizId: string | null | undefined,
): Promise<SafeQuizInput | null> {
  if (!relatedQuizId) return null;

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, relatedQuizId), isNull(quizzes.deletedAt)),
  });
  if (!quiz) return null;

  const qs = await db
    .select({
      order: questions.order,
      type: questions.type,
      question: questions.question,
      options: questions.options,
    })
    .from(questions)
    .where(eq(questions.quizId, quiz.id));

  return {
    title: quiz.title,
    description: quiz.description,
    questions: qs.map((q) => ({
      order: q.order,
      type: q.type,
      question: q.question,
      options: Array.isArray(q.options) ? (q.options as string[]) : null,
    })),
  };
}

export async function professorCanLinkQuiz(
  professorId: string,
  quizId: string,
): Promise<boolean> {
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), isNull(quizzes.deletedAt)),
  });
  if (!quiz) return false;
  if (quiz.professorId === professorId) return true;

  const taught = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, professorId),
  });
  if (taught.length === 0) return false;
  const taughtIds = taught.map((t) => t.sectionId);

  const links = await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, taughtIds),
  });
  return links.some((l) => l.quizId === quizId);
}
