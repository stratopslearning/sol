import { redirect } from 'next/navigation';

import { withBasePath } from '@/lib/basePath';

export default async function StudentSectionWorkRedirect({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  redirect(
    withBasePath(`/dashboard/student/sections/${sectionId}/assignments`),
  );
}
