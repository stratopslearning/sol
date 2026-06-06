import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { appRedirect } from '@/lib/serverRedirect';

import { db } from '@/app/db';
import { professorSections } from '@/app/db/schema';
import { SectionDetailView } from '@/components/sections/SectionDetailView';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';
import { loadSectionDetailData } from '@/lib/sectionDetailData';

import LeaveSectionButton from './LeaveSectionButton';
import UnassignQuizButton from './UnassignQuizButton';

export default async function SectionDetailsPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;

  const me = await requireAuth();
  if (me.role !== 'PROFESSOR' && me.role !== 'ADMIN') {
    appRedirect('/unauthorized');
  }

  if (me.role !== 'ADMIN') {
    const enrollment = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.sectionId, sectionId),
        eq(professorSections.professorId, me.id),
      ),
    });
    if (!enrollment) return notFound();
  }

  const data = await loadSectionDetailData(sectionId);
  if (!data) return notFound();

  return (
    <AppShell
      role="professor"
      active="sections"
      topbarEyebrow="Faculty"
      topbarTitle={data.section.name}
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          {
            label: 'My sections',
            href: withBasePath('/dashboard/professor/sections'),
          },
          { label: data.section.name },
        ]}
        eyebrow="Section"
        title={data.section.name}
        description={
          data.section.course
            ? `${data.section.course.title}${
                data.section.course.description
                  ? ` · ${data.section.course.description}`
                  : ''
              }`
            : 'Section detail'
        }
        actions={
          <Button asChild variant="outline">
            <a
              href={withBasePath(
                `/dashboard/professor/sections/${data.section.id}/gradebook`,
              )}
            >
              Gradebook
            </a>
          </Button>
        }
      />

      <SectionDetailView
        data={data}
        role="professor"
        sectionId={sectionId}
        enrollmentActions={<LeaveSectionButton sectionId={data.section.id} />}
        quizRowActions={(quizId) => (
          <UnassignQuizButton quizId={quizId} sectionId={sectionId} />
        )}
      />
    </AppShell>
  );
}
