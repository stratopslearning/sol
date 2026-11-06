import { notFound } from 'next/navigation';

import AuthoringClient from '@/app/dashboard/professor/authoring/[courseId]/AuthoringClient';
import { ProfessorToolCourseShell } from '@/components/professor/ProfessorToolCourseShell';
import {
  getCurrentOutlineForCourse,
  listAuthoringMessages,
  listOutlinesForCourse,
  listTeachableSectionIdsForCourse,
} from '@/lib/authoring';
import { appPath } from '@/lib/basePath';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { fetchSectionsByIds } from '@/lib/db/entityScopedReads';
import {
  assertCanManageCourse,
  listCourseLinkedDocuments,
  listCourseMaterials,
  listTeachableCourses,
  listWorkspaceDocuments,
} from '@/lib/knowledge';
import { getCourseWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function ProfessorAuthoringPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ refineRevision?: string }>;
}) {
  const user = await requireTeachingAccess();

  const { courseId } = await params;
  const { refineRevision } = await searchParams;

  let course: { id: string; title: string };
  try {
    course = await assertCanManageCourse(user, courseId);
  } catch {
    notFound();
  }

  const workspaceId = await getCourseWorkspaceId(courseId);
  const [
    outline,
    sessions,
    materials,
    linkedDocuments,
    libraryDocuments,
    teachable,
    teachableSectionIds,
  ] = await Promise.all([
    getCurrentOutlineForCourse(user, courseId),
    listOutlinesForCourse(user, courseId, { includeArchived: true }),
    listCourseMaterials(user, courseId),
    listCourseLinkedDocuments(user, courseId),
    workspaceId
      ? listWorkspaceDocuments(user, workspaceId)
      : Promise.resolve([]),
    listTeachableCourses(user),
    listTeachableSectionIdsForCourse(user, courseId),
  ]);
  const sectionRows = teachableSectionIds.length
    ? await fetchSectionsByIds(teachableSectionIds)
    : [];
  const sectionOptions = sectionRows.map((s) => ({
    id: s.id,
    title: s.name,
  }));
  const messages = outline
    ? await listAuthoringMessages(user, outline.id)
    : [];

  // Prefer Knowledge links (where chunks live). Skip legacy uploads that were
  // mirrored into the library so focus IDs resolve to indexed documents.
  const linkedTitles = new Set(linkedDocuments.map((d) => d.title));
  const unmirroredUploads = materials.filter((m) => !linkedTitles.has(m.title));

  const corpusItems = [
    ...linkedDocuments.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      kind: 'library' as const,
    })),
    ...unmirroredUploads.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      kind: 'upload' as const,
    })),
  ];
  const materialsReady = corpusItems.filter((c) => c.status === 'READY').length;
  const materialsTotal = corpusItems.length;

  const linkedIds = new Set(linkedDocuments.map((d) => d.id));
  const attachableDocuments = libraryDocuments
    .filter((d) => !linkedIds.has(d.id) && d.status === 'READY')
    .map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      sourceKind: d.sourceKind,
    }));

  return (
    <ProfessorToolCourseShell
      active="authoring"
      toolLabel="Authoring"
      toolHref="/dashboard/professor/authoring"
      courseId={courseId}
      courseTitle={course.title}
      description=""
      teachable={teachable}
      hrefTemplate="/dashboard/professor/authoring/{courseId}"
      compactHeader
      flush
    >
      <AuthoringClient
        courseId={courseId}
        courseTitle={course.title}
        initialOutline={outline}
        initialMessages={messages}
        initialSessions={sessions.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          brief: s.brief,
          preview: s.preview,
          createdAt:
            s.createdAt instanceof Date
              ? s.createdAt.toISOString()
              : String(s.createdAt),
          updatedAt:
            s.updatedAt instanceof Date
              ? s.updatedAt.toISOString()
              : String(s.updatedAt),
        }))}
        materialsHref={appPath(`/dashboard/professor/materials/${courseId}`)}
        materialsReady={materialsReady}
        materialsTotal={materialsTotal}
        attachableDocuments={attachableDocuments}
        corpusItems={corpusItems}
        initialRefineRevisionId={refineRevision ?? null}
        sectionOptions={sectionOptions}
      />
    </ProfessorToolCourseShell>
  );
}
