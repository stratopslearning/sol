import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';
import { listCourseRubricsDefiner } from '@/lib/db/lmsDefiners';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);
  const rubrics = await listCourseRubricsDefiner(ctx.courseId);
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('rubrics', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Rubrics"
    >
      <ul className="space-y-2">
        {rubrics.map((r) => (
          <li key={String(r.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            {String(r.title)}
          </li>
        ))}
        {rubrics.length === 0 ? (
          <li className="text-sm text-ink-muted">No course rubrics yet.</li>
        ) : null}
      </ul>
    </SectionHubShell>
  );
}
