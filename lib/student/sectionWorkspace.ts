import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { sections } from '@/app/db/schema';
import { isCreatorWorkspaceUnverified } from '@/lib/onboarding/workspaceSettings';

export async function isStudentSectionInUnverifiedCreatorWorkspace(
  sectionId: string,
): Promise<boolean> {
  const row = await db.query.sections.findFirst({
    where: eq(sections.id, sectionId),
    with: {
      course: {
        with: {
          workspace: true,
        },
      },
    },
  });
  return isCreatorWorkspaceUnverified(row?.course?.workspace ?? null);
}
