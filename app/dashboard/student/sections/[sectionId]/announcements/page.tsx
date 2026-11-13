import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';
import { listCourseAnnouncementsDefiner } from '@/lib/db/lmsDefiners';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);
  const announcements = (await listCourseAnnouncementsDefiner(ctx.courseId)).filter(
    (a) => a.publishedAt != null,
  );
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('announcements', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Announcements"
    >
      <ul className="space-y-3">
        {announcements.length === 0 ? (
          <li className="text-sm text-ink-muted">No announcements.</li>
        ) : (
          announcements.map((a) => (
            <li key={String(a.id)} className="rounded border border-rule/60 p-3">
              <div className="font-medium">{String(a.title)}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                {String(a.bodyMarkdown ?? '')}
              </p>
            </li>
          ))
        )}
      </ul>
    </SectionHubShell>
  );
}
