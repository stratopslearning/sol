import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';
import { listLearningOutcomesDefiner } from '@/lib/db/lmsDefiners';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);
  const outcomes = await listLearningOutcomesDefiner(ctx.courseId);
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('outcomes', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Outcomes"
    >
      <ul className="space-y-2">
        {outcomes.map((o) => (
          <li key={String(o.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            {String(o.title)}
            <span className="ml-2 text-xs text-ink-muted">
              mastery {String(o.masteryPercent ?? 70)}%
            </span>
          </li>
        ))}
        {outcomes.length === 0 ? (
          <li className="text-sm text-ink-muted">No outcomes published.</li>
        ) : null}
      </ul>
    </SectionHubShell>
  );
}
