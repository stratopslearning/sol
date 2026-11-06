import { db } from "@/app/db";
import { quizzes, sections } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { activeOnly } from "@/lib/db/filters";
import { requireAdmin } from "@/lib/auth";
import { partitionBySectionConclusion } from "@/lib/sectionAvailability";
import { listCoursesForWorkspace, resolveWorkspaceScopeParam } from "@/lib/workspace/queries";

import AdminQuizzesPageClient from "./AdminQuizzesPageClient";

export default async function AdminQuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const scope = resolveWorkspaceScopeParam(params.workspaceId);
  const workspaceScope = scope === 'all' ? null : scope;
  const workspaceCourses = workspaceScope
    ? await listCoursesForWorkspace(workspaceScope)
    : [];
  const courseIds = new Set(workspaceCourses.map((c) => c.id));
  const allSectionsRaw = (
    await db.query.sections.findMany({
      where: activeOnly(sections.deletedAt),
      with: { course: true },
    })
  ).filter((s) => courseIds.has(s.courseId));
  const { active: ongoingSections } =
    partitionBySectionConclusion(allSectionsRaw);
  const allQuizzesRaw = await db.query.quizzes.findMany({
    where: activeOnly(quizzes.deletedAt),
  });
  const ongoingIds = new Set(ongoingSections.map((s) => s.id));
  const allQuizSections = (await db.query.quizSections.findMany()).filter(
    (qs) => ongoingIds.has(qs.sectionId),
  );

  return (
    <AppShell role="admin" active="workspaces" topbarTitle="Assignments">
      <AdminQuizzesPageClient
        allSections={ongoingSections}
        allQuizzes={allQuizzesRaw}
        allQuizSections={allQuizSections}
      />
    </AppShell>
  );
}
