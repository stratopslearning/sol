import { SectionHubShell } from '@/components/student/SectionHubShell';
import {
  requireStudentSectionLms,
  studentActiveTool,
} from '@/lib/lms/studentSectionContext';
import { listStudentActivities } from '@/lib/assignments';
import { withBasePath } from '@/lib/basePath';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const { user, ctx, lms } = await requireStudentSectionLms(sectionId);
  const activities = (
    await listStudentActivities({
      studentId: user.id,
      sectionIds: [sectionId],
    })
  ).filter((a) => a.type === 'QUIZ');
  return (
    <SectionHubShell
      sectionId={ctx.sectionId}
      sectionName={ctx.sectionName}
      courseTitle={ctx.courseTitle}
      activeTab={studentActiveTool('quizzes', lms.enabled)}
      tools={lms.enabled ? lms.studentTools : undefined}
      user={user}
      description="Quizzes"
    >
      <ul className="space-y-2">
        {activities.map((a) => (
          <li key={a.id}>
            <a
              className="text-sm text-brand hover:underline"
              href={withBasePath(`/dashboard/student/quiz/${a.quizId ?? a.id}`)}
            >
              {a.title}
            </a>
          </li>
        ))}
        {activities.length === 0 ? (
          <li className="text-sm text-ink-muted">No quizzes assigned.</li>
        ) : null}
      </ul>
    </SectionHubShell>
  );
}
