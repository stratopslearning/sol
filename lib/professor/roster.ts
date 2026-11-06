import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { studentSections } from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { authorize, tenantIdForSection } from '@/lib/authz';
import { logAudit } from '@/lib/audit';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id' | 'platformStaff' | 'clerkId'>;

/** Soft-drop a student from a section (status DROPPED). Does not delete the user. */
export async function dropStudentFromSection(
  user: AuthUser,
  opts: { sectionId: string; enrollmentId: string },
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const tenantId = await tenantIdForSection(opts.sectionId);
  if (!tenantId) throw ApiError.notFound('Section not found');
  const allowed = await authorize(user, 'roster.manage', {
    tenantId,
    scopeType: 'section',
    scopeId: opts.sectionId,
  });
  if (!allowed) {
    throw ApiError.forbidden('You cannot manage the roster for this section');
  }

  const enrollment = await db.query.studentSections.findFirst({
    where: and(
      eq(studentSections.id, opts.enrollmentId),
      eq(studentSections.sectionId, opts.sectionId),
    ),
  });
  if (!enrollment) throw ApiError.notFound('Enrollment not found');
  if (enrollment.status === 'DROPPED') {
    throw ApiError.badRequest('Student is already dropped from this section');
  }

  await db
    .update(studentSections)
    .set({ status: 'DROPPED' })
    .where(eq(studentSections.id, enrollment.id));

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'education.student_enrollment.drop',
    targetType: 'section',
    targetId: opts.sectionId,
    metadata: {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
    },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });
}
