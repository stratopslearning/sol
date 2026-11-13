import { notFound } from 'next/navigation';

import { AssignActivityToSectionDialog } from '@/components/sections/AssignActivityToSectionDialog';
import { SectionDetailView } from '@/components/sections/SectionDetailView';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { listCourseActivities } from '@/lib/assignments';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { withBasePath } from '@/lib/basePath';
import { entityIdForActivity } from '@/lib/professor/activityEntity';
import { assertTeachesSection } from '@/lib/professor/sections';
import { loadSectionDetailData } from '@/lib/sectionDetailData';

import { CanvasLinkPanel } from '@/components/sections/CanvasLinkPanel';

import LeaveSectionButton from './LeaveSectionButton';
import UnassignQuizButton from './UnassignQuizButton';
import UnassignDiscussionButton from './UnassignDiscussionButton';

export default async function SectionDetailsPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;

  const me = await requireTeachingAccess();
  try {
    await assertTeachesSection(me, sectionId);
  } catch {
    return notFound();
  }

  const data = await loadSectionDetailData(sectionId);
  if (!data) return notFound();

  const courseId = data.section.course?.id;
  const courseTitle = data.section.course?.title;

  const courseActivities = courseId
    ? await listCourseActivities({ courseId })
    : [];
  const assignableSeen = new Set<string>();
  const assignableActivities: Array<{
    type: 'QUIZ' | 'DISCUSSION' | 'INTERACTIVE';
    entityId: string;
    title: string;
    assigned: boolean;
  }> = [];
  for (const a of courseActivities) {
    if (
      a.type !== 'QUIZ' &&
      a.type !== 'DISCUSSION' &&
      a.type !== 'INTERACTIVE'
    ) {
      continue;
    }
    const entityId = entityIdForActivity(a);
    if (!entityId) continue;
    const key = `${a.type}:${entityId}`;
    if (assignableSeen.has(key)) continue;
    assignableSeen.add(key);
    assignableActivities.push({
      type: a.type,
      entityId,
      title: a.title,
      assigned: a.sectionIds.includes(sectionId),
    });
  }

  return (
    <AppShell
      role="professor"
      active="courses"
      topbarTitle={data.section.name}
    >
      <PageHeader
        breadcrumbs={[
          {
            label: 'Courses',
            href: withBasePath('/dashboard/professor/courses'),
          },
          ...(courseId && courseTitle
            ? [
                {
                  label: courseTitle,
                  href: withBasePath(
                    `/dashboard/professor/courses/${courseId}/sections`,
                  ),
                },
              ]
            : []),
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
        courseworkActions={
          courseId ? (
            <AssignActivityToSectionDialog
              sectionId={sectionId}
              sectionName={data.section.name}
              activities={assignableActivities}
            />
          ) : null
        }
        quizRowActions={(quizId) => (
          <UnassignQuizButton quizId={quizId} sectionId={sectionId} />
        )}
        discussionRowActions={(chatbotId) => (
          <UnassignDiscussionButton
            chatbotId={chatbotId}
            sectionId={sectionId}
          />
        )}
      />

      <CanvasLinkPanel sectionId={sectionId} />
    </AppShell>
  );
}
