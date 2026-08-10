import { and, eq, isNull, or } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { db } from '@/app/db';
import { chatbots, professorSections } from '@/app/db/schema';
import ProfessorDiscussionsTableClient from './ProfessorDiscussionsTableClient';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ensureCh1TemplateChatbot } from '@/lib/chatbot/seed';
import { appPath, withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { partitionEnrollmentsByConclusion } from '@/lib/sectionAvailability';

export default async function ProfessorDiscussionsPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  await ensureCh1TemplateChatbot();

  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: { section: { with: { course: true } } },
  });
  const { active: ongoingEnrollments } =
    partitionEnrollmentsByConclusion(enrollments);
  const ongoingSectionIds = new Set(
    ongoingEnrollments.map((e) => e.sectionId),
  );

  const ownedAndTemplates = await db.query.chatbots.findMany({
    where: and(
      isNull(chatbots.deletedAt),
      or(eq(chatbots.professorId, user.id), eq(chatbots.isTemplate, true)),
    ),
    with: {
      relatedQuiz: true,
      sectionAssignments: { with: { section: true } },
    },
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });

  const rows = ownedAndTemplates.map((bot) => ({
    id: bot.id,
    title: bot.title,
    personaName: bot.personaName,
    isTemplate: bot.isTemplate,
    relatedQuizTitle: bot.relatedQuiz?.title ?? null,
    sectionNames: (bot.sectionAssignments ?? [])
      .filter((sa) => sa.sectionId && ongoingSectionIds.has(sa.sectionId))
      .map((sa) => sa.section?.name)
      .filter((n): n is string => Boolean(n)),
    isActive: bot.isActive,
  }));

  return (
    <AppShell
      role="professor"
      active="discussions"
      topbarEyebrow="Faculty"
      topbarTitle="Discussions"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          { label: 'Discussions' },
        ]}
        eyebrow="Discussions"
        title="Socratic chapter chats."
        description="Author guided discussions for any chapter or link a quiz in learning mode. Duplicate the Chapter 1 template to get started."
        actions={
          <Button asChild>
            <Link href={appPath('/dashboard/professor/discussions/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New discussion
            </Link>
          </Button>
        }
      />
      <div className="mt-10">
        <ProfessorDiscussionsTableClient discussions={rows} />
      </div>
    </AppShell>
  );
}
