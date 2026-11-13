import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';
import { listCoursePagesDefiner } from '@/lib/db/lmsDefiners';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);
  const pages = (await listCoursePagesDefiner(ctx.courseId)).filter(
    (p) => p.published,
  );
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('pages', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Pages"
    >
      <ul className="space-y-3">
        {pages.map((p) => (
          <li key={String(p.id)} className="rounded border border-rule/60 p-3">
            <div className="font-medium">{String(p.title)}</div>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">
              {String(p.markdown ?? '')}
            </pre>
          </li>
        ))}
        {pages.length === 0 ? (
          <li className="text-sm text-ink-muted">No pages published.</li>
        ) : null}
      </ul>
    </SectionHubShell>
  );
}
