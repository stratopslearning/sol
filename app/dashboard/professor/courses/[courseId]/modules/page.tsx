import { BackfillModulesButton } from '@/components/lms/BackfillModulesButton';
import { ModulesEditorClient } from '@/components/lms/ModulesEditorClient';
import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { listModulesWithItems } from '@/lib/lms/modules';

export const dynamic = 'force-dynamic';

export default async function ModulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const studentView = sp.as === 'student';
  const { course, lms } = await requireFacultyCourse(courseId);
  const modules = await listModulesWithItems(courseId);

  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('modules', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description={
        studentView
          ? 'Student preview of modules.'
          : 'Ordered units with publish, unlock, prerequisites, and completion rules.'
      }
      actions={
        studentView ? null : <BackfillModulesButton courseId={courseId} />
      }
    >
      <ModulesEditorClient
        courseId={courseId}
        studentPreview={studentView}
        initialModules={modules.map((m) => ({
          id: m.id,
          title: m.title,
          position: m.position,
          published: m.published,
          unlockAt: m.unlockAt ? m.unlockAt.toISOString() : null,
          prerequisiteModuleIds: m.prerequisiteModuleIds,
          items: m.items.map((i) => ({
            id: i.id,
            title: i.title,
            type: i.type,
            isHeader: i.isHeader,
            published: i.published,
            lessonId: i.lessonId,
            quizId: i.quizId,
            interactiveId: i.interactiveId,
            chatbotId: i.chatbotId,
            completionRequirement: i.completionRequirement,
          })),
        }))}
      />
    </CourseHubShell>
  );
}
