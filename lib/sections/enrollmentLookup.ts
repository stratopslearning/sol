import { resolveSectionByEnrollmentCode } from '@/lib/db/facultyStudentReads';
import { fetchSectionById } from '@/lib/db/entityScopedReads';

type SectionLite = {
  id: string;
  courseId: string;
  workspaceId: string | null;
  tenantId: string | null;
  name: string;
  professorEnrollmentCode: string;
  studentEnrollmentCode: string;
  offeringId: string | null;
  isActive: boolean;
  endsAt: Date | null;
  deletedAt: Date | null;
};

async function hydrateSection(sectionId: string): Promise<SectionLite | null> {
  return fetchSectionById(sectionId);
}

export async function findSectionByProfessorCode(
  workspaceId: string,
  enrollmentCode: string,
): Promise<SectionLite | undefined> {
  const resolved = await resolveSectionByEnrollmentCode(enrollmentCode);
  if (!resolved || resolved.codeKind !== 'professor') return undefined;
  if (
    resolved.workspaceId &&
    resolved.workspaceId !== workspaceId &&
    resolved.tenantId !== workspaceId
  ) {
    return undefined;
  }
  const section = await hydrateSection(resolved.sectionId);
  return section ?? undefined;
}

export async function findSectionByStudentCode(
  workspaceId: string,
  enrollmentCode: string,
): Promise<SectionLite | undefined> {
  const resolved = await resolveSectionByEnrollmentCode(enrollmentCode);
  if (!resolved || resolved.codeKind !== 'student') return undefined;
  if (
    resolved.workspaceId &&
    resolved.workspaceId !== workspaceId &&
    resolved.tenantId !== workspaceId
  ) {
    return undefined;
  }
  const section = await hydrateSection(resolved.sectionId);
  return section ?? undefined;
}

/**
 * When workspace is unknown, allow enroll only if the code resolves uniquely.
 */
export async function findSectionByStudentCodeGloballyUnique(
  enrollmentCode: string,
): Promise<{ section: SectionLite; workspaceId: string } | null> {
  const resolved = await resolveSectionByEnrollmentCode(enrollmentCode);
  if (!resolved || resolved.codeKind !== 'student') return null;
  const workspaceId = resolved.workspaceId ?? resolved.tenantId;
  if (!workspaceId) return null;
  const section = await hydrateSection(resolved.sectionId);
  if (!section) return null;
  return { section, workspaceId };
}

export async function findSectionByProfessorCodeGloballyUnique(
  enrollmentCode: string,
): Promise<{ section: SectionLite; workspaceId: string } | null> {
  const resolved = await resolveSectionByEnrollmentCode(enrollmentCode);
  if (!resolved || resolved.codeKind !== 'professor') return null;
  const workspaceId = resolved.workspaceId ?? resolved.tenantId;
  if (!workspaceId) return null;
  const section = await hydrateSection(resolved.sectionId);
  if (!section) return null;
  return { section, workspaceId };
}
