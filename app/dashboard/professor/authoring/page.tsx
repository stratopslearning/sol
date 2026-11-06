import { ProfessorToolLanding } from '@/components/professor/ProfessorToolLanding';
import { requireTeachingAccess } from '@/lib/authz/gates';

export const dynamic = 'force-dynamic';

export default async function ProfessorAuthoringLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireTeachingAccess();
  const params = await searchParams;

  return (
    <ProfessorToolLanding
      user={user}
      active="authoring"
      toolLabel="Authoring"
      title="Authoring"
      description="Pick a course to draft quizzes, discussions, and practice from materials."
      hrefTemplate="/dashboard/professor/authoring/{courseId}"
      courseIdParam={params.courseId}
    />
  );
}
