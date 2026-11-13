import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';
import { listStudentBooks } from '@/lib/books';
import { withBasePath } from '@/lib/basePath';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);
  const books = await listStudentBooks(user.id, { sectionId });
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('files', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Files"
    >
      <ul className="space-y-2">
        {books.map((b) => (
          <li key={b.id}>
            <a
              className="text-sm text-brand hover:underline"
              href={withBasePath(
                `/dashboard/student/sections/${sectionId}/books`,
              )}
            >
              {b.title}
            </a>
          </li>
        ))}
        {books.length === 0 ? (
          <li className="text-sm text-ink-muted">No files or books released.</li>
        ) : null}
      </ul>
    </SectionHubShell>
  );
}
