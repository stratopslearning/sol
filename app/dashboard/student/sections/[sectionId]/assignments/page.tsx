import { AssignmentsTableClient } from '@/components/assignments/AssignmentsTableClient';
import { SectionHubShell } from '@/components/student/SectionHubShell';
import { listStudentActivities } from '@/lib/assignments';
import { requireStudent } from '@/lib/auth';
import { requireStudentSectionAccess } from '@/lib/student/sectionAccess';

export default async function StudentSectionAssignmentsPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const user = await requireStudent();
  const { sectionId } = await params;
  const ctx = await requireStudentSectionAccess(user.id, sectionId);
  const items = await listStudentActivities({
    studentId: user.id,
    sectionIds: [sectionId],
  });

  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      description="Quizzes, lessons, discussions, and interactives assigned to this section."
      activeTab="assignments"
      user={user}
    >
      <AssignmentsTableClient items={items} role="student" />
    </SectionHubShell>
  );
}
