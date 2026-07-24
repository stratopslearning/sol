import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbotAssignments,
  chatbotSections,
  chatbotSessions,
  studentSections,
} from '@/app/db/schema';
import StudentDiscussionsTableClient from './StudentDiscussionsTableClient';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export default async function StudentDiscussionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'STUDENT') return null;

  const enrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.studentId, user.id),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { section: true },
  });

  const sectionIds = enrollments.map((e) => e.sectionId);

  const assignments =
    sectionIds.length > 0
      ? await db.query.chatbotSections.findMany({
          where: inArray(chatbotSections.sectionId, sectionIds),
          with: {
            chatbot: {
              with: {
                relatedQuiz: true,
                sectionAssignments: { with: { section: true } },
              },
            },
            section: true,
          },
        })
      : [];

  const seen = new Set<string>();
  const bots = assignments
    .map((a) => a.chatbot)
    .filter((bot) => {
      if (!bot || bot.deletedAt || !bot.isActive || bot.isTemplate) return false;
      if (seen.has(bot.id)) return false;
      seen.add(bot.id);
      return true;
    });

  const studentAssignments = await db.query.chatbotAssignments.findMany({
    where: eq(chatbotAssignments.studentId, user.id),
  });
  const assignmentByBot = Object.fromEntries(
    studentAssignments.map((a) => [a.chatbotId, a]),
  );

  const sessions = await db.query.chatbotSessions.findMany({
    where: eq(chatbotSessions.studentId, user.id),
  });

  const rows = bots.map((bot) => {
    const assignment = assignmentByBot[bot.id];
    const botSessions = sessions.filter((s) => s.chatbotId === bot.id);
    const inProgress = botSessions.some((s) => s.status === 'in_progress');
    const completed =
      assignment?.isCompleted ||
      botSessions.some((s) => s.status === 'completed');
    const latestCompleted = botSessions
      .filter((s) => s.status === 'completed')
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      )[0];

    return {
      id: bot.id,
      title: bot.title,
      personaName: bot.personaName,
      relatedQuizTitle: bot.relatedQuiz?.title ?? null,
      learningMode: Boolean(bot.relatedQuizId),
      sectionNames: (bot.sectionAssignments ?? [])
        .map((sa) => sa.section?.name)
        .filter((n): n is string => Boolean(n)),
      status: completed
        ? ('completed' as const)
        : inProgress
          ? ('in_progress' as const)
          : ('open' as const),
      latestSessionId: latestCompleted?.id ?? null,
    };
  });

  return (
    <AppShell
      role="student"
      active="discussions"
      topbarEyebrow="Learner"
      topbarTitle="My Discussions"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/student') },
          { label: 'My Discussions' },
        ]}
        eyebrow="Discussions"
        title="Socratic chapter chats."
        description="Guided conversations with your course bots. Learning mode coaches you — it will not give quiz answers."
      />
      <div className="mt-10">
        <StudentDiscussionsTableClient discussions={rows} />
      </div>
    </AppShell>
  );
}
