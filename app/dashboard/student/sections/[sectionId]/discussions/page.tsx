import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';
import { listPeerDiscussionsDefiner } from '@/lib/db/lmsDefiners';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);
  const discussions = (await listPeerDiscussionsDefiner(ctx.courseId)).filter(
    (d) => d.published,
  );
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('discussions', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Discussions"
    >
      <ul className="space-y-2">
        {discussions.map((d) => (
          <li key={String(d.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            <div className="font-medium">{String(d.title)}</div>
            <p className="mt-1 text-ink-muted whitespace-pre-wrap">
              {String(d.promptMarkdown ?? '')}
            </p>
          </li>
        ))}
        {discussions.length === 0 ? (
          <li className="text-sm text-ink-muted">No discussions yet.</li>
        ) : null}
      </ul>
    </SectionHubShell>
  );
}
