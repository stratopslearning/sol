import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbots,
  professorSections,
  quizSections,
  quizzes,
} from '@/app/db/schema';
import { ChatbotCreationForm } from '@/components/chatbot/ChatbotCreationForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { appRedirect } from '@/lib/serverRedirect';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDiscussionPage(props: PageProps) {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  const { id } = await props.params;
  const bot = await db.query.chatbots.findFirst({
    where: and(
      eq(chatbots.id, id),
      isNull(chatbots.deletedAt),
      eq(chatbots.professorId, user.id),
    ),
    with: { sectionAssignments: true },
  });
  if (!bot || bot.isTemplate) {
    appRedirect('/dashboard/professor/discussions');
  }

  const professorSectionsList = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: { section: { with: { course: true } } },
  });

  const enrolledSections = professorSectionsList.map((ps) => ({
    id: ps.section.id,
    title: `${ps.section.course.title} - ${ps.section.name}`,
  }));

  const enrolledSectionIds = professorSectionsList.map((ps) => ps.sectionId);
  const ownedQuizzes = await db.query.quizzes.findMany({
    where: eq(quizzes.professorId, user.id),
  });
  const sectionQuizLinks =
    enrolledSectionIds.length > 0
      ? await db.query.quizSections.findMany({
          where: inArray(quizSections.sectionId, enrolledSectionIds),
          with: { quiz: true },
        })
      : [];

  const quizMap = new Map<string, { id: string; title: string }>();
  for (const q of ownedQuizzes) {
    if (!q.deletedAt) quizMap.set(q.id, { id: q.id, title: q.title });
  }
  for (const link of sectionQuizLinks) {
    if (link.quiz && !link.quiz.deletedAt) {
      quizMap.set(link.quiz.id, {
        id: link.quiz.id,
        title: link.quiz.title,
      });
    }
  }

  return (
    <AppShell
      role="professor"
      active="discussions"
      topbarEyebrow="Faculty"
      topbarTitle="Edit discussion"
      maxWidth="narrow"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          {
            label: 'Discussions',
            href: withBasePath('/dashboard/professor/discussions'),
          },
          { label: 'Edit' },
        ]}
        eyebrow="Edit"
        title={bot.title}
        description="Update the flow, quiz link, or section assignments."
      />
      <div className="mt-10">
        <ChatbotCreationForm
          sections={enrolledSections}
          quizzes={Array.from(quizMap.values())}
          initial={{
            id: bot.id,
            title: bot.title,
            description: bot.description ?? undefined,
            personaName: bot.personaName,
            instructions: bot.instructions,
            systemPrompt: bot.systemPrompt,
            relatedQuizId: bot.relatedQuizId,
            sectionIds: bot.sectionAssignments.map((s) => s.sectionId),
          }}
        />
      </div>
    </AppShell>
  );
}
