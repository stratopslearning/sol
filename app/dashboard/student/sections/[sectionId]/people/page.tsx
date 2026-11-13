import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';


export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);

  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('people', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="People"
    >
      <p className="text-sm text-ink-muted">
        Classmates and instructors for this section. Roster details are limited
        for privacy.
      </p>
    </SectionHubShell>
  );
}
