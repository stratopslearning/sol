import { ProfessorToolLanding } from '@/components/professor/ProfessorToolLanding';
import { requireTeachingAccess } from '@/lib/authz/gates';

export const dynamic = 'force-dynamic';

export default async function ProfessorAssignmentsLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireTeachingAccess();
  const params = await searchParams;

  return (
    <ProfessorToolLanding
      user={user}
      active="assignments"
      toolLabel="Assignments"
      title="Assignments"
      description="Pick a course to create quizzes, discussions, and interactives — by hand or from Authoring."
      hrefTemplate="/dashboard/professor/assignments/{courseId}"
      courseIdParam={params.courseId}
    />
  );
}
