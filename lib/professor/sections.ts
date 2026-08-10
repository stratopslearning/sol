/**
 * Professor section reads, shared by the dashboard, the REST API, and MCP
 * tools. Mirrors the SSR logic of `/dashboard/professor/sections`.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { professorSections } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import type { UserData } from '@/lib/getOrCreateUser';
import { partitionEnrollmentsByConclusion } from '@/lib/sectionAvailability';
import {
  loadSectionDetailData,
  type SectionDetailData,
} from '@/lib/sectionDetailData';

export type ProfessorSectionSummary = {
  id: string;
  name: string;
  course: { id: string; title: string } | null;
  learnerCount: number;
  endsAt: Date | null;
  archived: boolean;
  enrolledAt: Date;
};

type ProfessorUser = Pick<UserData, 'id' | 'role'>;

export async function listProfessorSections(
  user: ProfessorUser,
): Promise<{ active: ProfessorSectionSummary[]; archived: ProfessorSectionSummary[] }> {
  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
    with: {
      section: {
        with: {
          course: true,
          studentSections: true,
        },
      },
    },
  });

  const { active, archived } = partitionEnrollmentsByConclusion(
    enrollments.filter((e) => e.section && e.section.deletedAt == null),
  );

  const toSummary = (
    e: (typeof enrollments)[number],
    isArchived: boolean,
  ): ProfessorSectionSummary => ({
    id: e.section.id,
    name: e.section.name,
    course: e.section.course
      ? { id: e.section.course.id, title: e.section.course.title }
      : null,
    learnerCount: e.section.studentSections.filter(
      (s) => s.status === 'ACTIVE',
    ).length,
    endsAt: e.section.endsAt ?? null,
    archived: isArchived,
    enrolledAt: e.enrolledAt,
  });

  return {
    active: active.map((e) => toSummary(e, false)),
    archived: archived.map((e) => toSummary(e, true)),
  };
}

/** Throws 403 unless the professor teaches the section (admins bypass). */
export async function assertTeachesSection(
  user: ProfessorUser,
  sectionId: string,
): Promise<void> {
  if (user.role === 'ADMIN') return;
  const enrollment = await db.query.professorSections.findFirst({
    where: (t, { and, eq: eqOp }) =>
      and(eqOp(t.sectionId, sectionId), eqOp(t.professorId, user.id)),
  });
  if (!enrollment) {
    throw ApiError.forbidden('You do not teach this section');
  }
}

/**
 * Full section detail (roster, codes, assigned quizzes and discussions) for a
 * teaching professor or admin.
 */
export async function getProfessorSectionDetail(
  user: ProfessorUser,
  sectionId: string,
): Promise<SectionDetailData> {
  await assertTeachesSection(user, sectionId);
  const detail = await loadSectionDetailData(sectionId);
  if (!detail) throw ApiError.notFound('Section not found');
  return detail;
}
