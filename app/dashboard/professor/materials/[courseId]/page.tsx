import { notFound } from 'next/navigation';

import MaterialsClient from '@/app/dashboard/professor/materials/[courseId]/MaterialsClient';
import { ProfessorToolCourseShell } from '@/components/professor/ProfessorToolCourseShell';
import {
  consolidateCourseBookKnowledge,
  listCourseBooks,
} from '@/lib/books';
import { requireTeachingAccess } from '@/lib/authz/gates';
import {
  assertCanManageCourse,
  listCourseLinkedDocuments,
  listCourseMaterials,
  listTeachableCourses,
  listWorkspaceDocuments,
} from '@/lib/knowledge';
import { getCourseWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function ProfessorMaterialsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireTeachingAccess();

  const { courseId } = await params;
  let course: { id: string; title: string };
  try {
    course = await assertCanManageCourse(user, courseId);
  } catch {
    notFound();
  }

  try {
    await consolidateCourseBookKnowledge(courseId);
  } catch (err) {
    console.warn('[materials] consolidate failed', err);
  }

  const workspaceId = await getCourseWorkspaceId(courseId);
  const [
    materialsRaw,
    books,
    linkedDocuments,
    libraryDocuments,
    teachable,
    bookLinkedMaterialIds,
  ] = await Promise.all([
    listCourseMaterials(user, courseId),
    listCourseBooks(user, courseId),
    listCourseLinkedDocuments(user, courseId),
    workspaceId
      ? listWorkspaceDocuments(user, workspaceId).catch((err) => {
          console.warn('[materials] workspace library list failed', err);
          return [];
        })
      : Promise.resolve([]),
    listTeachableCourses(user),
    import('@/lib/db/knowledgeJobDefiners').then((m) =>
      m.fetchBookLinkedMaterialIdsDefiner(courseId).catch((err) => {
        console.warn('[materials] book-linked material ids failed', err);
        return [] as string[];
      }),
    ),
  ]);

  // Book RAG rows live under Books — hide them from Uploads & library.
  const bookLinked = new Set(bookLinkedMaterialIds);
  const materials = materialsRaw.filter((m) => !bookLinked.has(m.id));

  const linkedIds = new Set(linkedDocuments.map((d) => d.id));
  const attachableDocuments = libraryDocuments.filter(
    (d) => !linkedIds.has(d.id) && d.status === 'READY',
  );

  return (
    <ProfessorToolCourseShell
      active="knowledge"
      toolLabel="Materials"
      toolHref="/dashboard/professor/materials"
      courseId={courseId}
      courseTitle={course.title}
      description="Files, links, and books for this course — grounds the tutor and authoring."
      teachable={teachable}
      hrefTemplate="/dashboard/professor/materials/{courseId}"
    >
      <MaterialsClient
        courseId={courseId}
        workspaceId={workspaceId}
        initialMaterials={materials}
        initialBooks={books}
        initialLinkedDocuments={linkedDocuments}
        attachableDocuments={attachableDocuments}
      />
    </ProfessorToolCourseShell>
  );
}
