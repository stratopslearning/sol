import { CourseHubShell } from '@/components/professor/CourseHubShell';
import {
  facultyActiveTool,
  requireFacultyCourse,
} from '@/lib/lms/facultyCourseContext';
import { CreateOutcomeForm } from '@/components/lms/CreateForms';
import { listLearningOutcomesDefiner } from '@/lib/db/lmsDefiners';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { courseId } = await params;
  const studentView = (await searchParams).as === 'student';
  const { user, course, lms } = await requireFacultyCourse(courseId);
  const outcomes = await listLearningOutcomesDefiner(courseId);
  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab={facultyActiveTool('outcomes', lms.enabled)}
      tools={lms.enabled ? lms.facultyTools : undefined}
      nav={lms.nav}
      studentView={studentView}
      description="Outcomes"
    >
      <CreateOutcomeForm courseId={courseId} />
      <ul className="mt-6 space-y-2">
        {outcomes.map((o) => (
          <li key={String(o.id)} className="rounded border border-rule/60 px-3 py-2 text-sm">
            {String(o.title)}
            <span className="ml-2 text-xs text-ink-muted">
              mastery {String(o.masteryPercent ?? 70)}%
            </span>
          </li>
        ))}
      </ul>
    </CourseHubShell>
  );
}
