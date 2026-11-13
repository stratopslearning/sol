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
  const syllabus = lms.syllabusMarkdown;
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('syllabus', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Syllabus"
    >
      {syllabus ? (
        <pre className="whitespace-pre-wrap rounded border border-rule/60 bg-surface p-4 text-sm">
          {syllabus}
        </pre>
      ) : (
        <p className="text-sm text-ink-muted">No syllabus posted yet.</p>
      )}
    </SectionHubShell>
  );
}
