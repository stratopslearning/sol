import { eq, inArray } from 'drizzle-orm';

import { db } from '@/app/db';
import { professorSections, quizSections, quizzes } from '@/app/db/schema';
import { ChatbotCreationForm } from '@/components/chatbot/ChatbotCreationForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

interface PageProps {
  searchParams: Promise<{ quizId?: string }>;
}

export default async function NewDiscussionPage(props: PageProps) {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  const { quizId } = await props.searchParams;

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
  const quizOptions = Array.from(quizMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  let initial:
    | {
        title?: string;
        description?: string;
        relatedQuizId?: string | null;
      }
    | undefined;

  if (quizId) {
    const quiz = quizMap.get(quizId);
    if (quiz) {
      const full = await db.query.quizzes.findFirst({
        where: eq(quizzes.id, quizId),
      });
      initial = {
        title: `${quiz.title} Discussion`,
        description: full?.description ?? undefined,
        relatedQuizId: quizId,
      };
    }
  }

  return (
    <AppShell
      role="professor"
      active="discussions"
      topbarEyebrow="Faculty"
      topbarTitle="Compose discussion"
      maxWidth="narrow"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          {
            label: 'Discussions',
            href: withBasePath('/dashboard/professor/discussions'),
          },
          { label: 'Compose' },
        ]}
        eyebrow="Compose"
        title="Set a new discussion."
        description="Author the Socratic flow, optionally link a quiz in learning mode, and assign sections."
      />
      <div className="mt-10">
        <ChatbotCreationForm
          sections={enrolledSections}
          quizzes={quizOptions}
          initial={initial}
        />
      </div>
    </AppShell>
  );
}
