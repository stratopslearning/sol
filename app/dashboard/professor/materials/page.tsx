import { ProfessorToolLanding } from '@/components/professor/ProfessorToolLanding';
import { requireTeachingAccess } from '@/lib/authz/gates';

export const dynamic = 'force-dynamic';

export default async function ProfessorMaterialsLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireTeachingAccess();
  const params = await searchParams;

  return (
    <ProfessorToolLanding
      user={user}
      active="knowledge"
      toolLabel="Materials"
      title="Materials"
      description="Pick a course to attach library docs, upload files, or import books."
      hrefTemplate="/dashboard/professor/materials/{courseId}"
      courseIdParam={params.courseId}
    />
  );
}
