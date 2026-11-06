/**
 * Full tenant graphs for DB / isolation tests across creator, department, institution.
 */
import { eq, inArray } from 'drizzle-orm';

import {
  assignments,
  attempts,
  courseOfferings,
  courses,
  professorSections,
  quizSections,
  quizzes,
  roleBindings,
  sections,
  studentSections,
  supportAccessGrants,
  users,
  workspaceLicenses,
  workspaceMemberships,
  workspaces,
} from '@/app/db/schema';

import type { TestDb } from './db';
import {
  assignQuizToSection,
  enrollStudent,
  makeAssignment,
  makeAttempt,
  makeCourseWithOffering,
  makeLicense,
  makeMembership,
  makeQuiz,
  makeSection,
  makeUser,
  makeWorkspace,
  randomSlug,
  type WorkspaceSku,
} from './factories';

const uniqueTag = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type TenantFixture = {
  workspaceId: string;
  professorId: string;
  studentId: string;
  courseId: string;
  sectionId: string;
  quizId: string;
  assignmentId: string;
  attemptId: string;
  offeringId: string;
  ownerId?: string;
  institutionId?: string | null;
  sku: WorkspaceSku;
};

export type SeedTenantGraphOpts = {
  sku?: WorkspaceSku;
  label?: string;
  /** When sku=department, optionally attach under a new or provided institution. */
  withParentInstitution?: boolean;
  parentInstitutionId?: string | null;
  /** Skip quiz/assignment/attempt (lighter fixture). */
  withQuiz?: boolean;
  withStudent?: boolean;
};

export type TenantGraph = TenantFixture & {
  ownerId: string;
  leadId: string;
  studentId: string | null;
  institutionId: string | null;
  offeringId: string;
  licenseId: string;
};

function licenseDefaults(sku: WorkspaceSku): Partial<typeof workspaceLicenses.$inferInsert> {
  if (sku === 'creator') {
    return {
      plan: 'creator',
      billingProvider: 'stripe',
      status: 'active',
    };
  }
  if (sku === 'institution') {
    return {
      plan: 'institution',
      billingProvider: 'manual',
      status: 'active',
    };
  }
  if (sku === 'business') {
    return {
      plan: 'business_team',
      billingProvider: 'stripe',
      status: 'active',
    };
  }
  return {
    plan: 'department',
    billingProvider: 'manual',
    status: 'active',
  };
}

/**
 * Seed a complete teaching graph for one SKU.
 * Authority: owner@org + lead_instructor@offering (+ student_sections when requested).
 */
export async function seedTenantGraph(
  db: TestDb,
  opts: SeedTenantGraphOpts = {},
): Promise<TenantGraph> {
  const sku = opts.sku ?? 'department';
  const label = opts.label ?? sku.slice(0, 3).toUpperCase();
  const withQuiz = opts.withQuiz !== false;
  const withStudent = opts.withStudent !== false;
  const tag = uniqueTag();

  let institutionId: string | null = opts.parentInstitutionId ?? null;
  if (sku === 'department' && opts.withParentInstitution && !institutionId) {
    const inst = await makeWorkspace(db, {
      type: 'institution',
      name: `Institution ${label}`,
      slug: `inst-${label}-${Date.now()}`.slice(0, 63),
    });
    await makeLicense(db, inst.id, licenseDefaults('institution'));
    institutionId = inst.id;
  }

  const ws = await makeWorkspace(db, {
    type: sku,
    name: `Isolation ${label}`,
    slug: `iso-${label}-${Date.now()}`.slice(0, 63),
    parentWorkspaceId: institutionId,
  });

  const owner = await makeUser(db, {
    email: `owner-${label}-${tag}@isolation.test`,
  });
  const lead = await makeUser(db, {
    email: `lead-${label}-${tag}@isolation.test`,
  });
  let student: Awaited<ReturnType<typeof makeUser>> | null = null;
  if (withStudent) {
    student = await makeUser(db, {
      email: `student-${label}-${tag}@isolation.test`,
    });
  }

  await makeMembership(db, ws.id, owner.id);
  await makeMembership(db, ws.id, lead.id);
  if (student) await makeMembership(db, ws.id, student.id);

  const license = await makeLicense(db, ws.id, licenseDefaults(sku));

  await db.insert(roleBindings).values({
    tenantId: ws.id,
    userId: owner.id,
    scopeType: 'organization',
    scopeId: ws.id,
    role: 'owner',
    grantedBy: owner.id,
  });

  const { course, offering, tenantId } = await makeCourseWithOffering(db, {
    workspaceId: ws.id,
    tenantId: ws.id,
    title: `Course ${label}`,
  });

  await db.insert(roleBindings).values({
    tenantId: ws.id,
    userId: lead.id,
    scopeType: 'offering',
    scopeId: offering.id,
    role: 'lead_instructor',
    grantedBy: owner.id,
  });

  const section = await makeSection(db, course.id, {
    workspaceId: ws.id,
    tenantId,
    offeringId: offering.id,
    name: `Section ${label}`,
  });

  await db.insert(professorSections).values({
    professorId: lead.id,
    sectionId: section.id,
    tenantId: ws.id,
    offeringId: offering.id,
  });

  if (student) {
    await enrollStudent(db, student.id, section.id, ws.id);
  }

  let quizId = '';
  let assignmentId = '';
  let attemptId = '';

  if (withQuiz) {
    const quiz = await makeQuiz(db, lead.id, {
      tenantId: ws.id,
      offeringId: offering.id,
      title: `Quiz ${label}`,
    });
    quizId = quiz.id;
    await assignQuizToSection(db, quiz.id, section.id, lead.id, ws.id);

    if (student) {
      const assignment = await makeAssignment(db, quiz.id, student.id, {
        tenantId: ws.id,
      });
      assignmentId = assignment!.id;
      const attempt = await makeAttempt(db, {
        assignmentId: assignment!.id,
        studentId: student.id,
        quizId: quiz.id,
        sectionId: section.id,
        tenantId: ws.id,
      });
      attemptId = attempt.id;
    }
  }

  return {
    workspaceId: ws.id,
    professorId: lead.id,
    leadId: lead.id,
    ownerId: owner.id,
    studentId: student?.id ?? null,
    courseId: course.id,
    sectionId: section.id,
    quizId,
    assignmentId,
    attemptId,
    offeringId: offering.id,
    institutionId,
    sku,
    licenseId: license.id,
  };
}

/** Two department children under one institution (sibling isolation). */
export async function seedSiblingDepartments(db: TestDb, label = 'SIB') {
  const inst = await makeWorkspace(db, {
    type: 'institution',
    name: `Institution ${label}`,
    slug: `inst-${label}-${Date.now()}`.slice(0, 63),
  });
  await makeLicense(db, inst.id, licenseDefaults('institution'));
  const a = await seedTenantGraph(db, {
    sku: 'department',
    label: `${label}A`,
    parentInstitutionId: inst.id,
  });
  const b = await seedTenantGraph(db, {
    sku: 'department',
    label: `${label}B`,
    parentInstitutionId: inst.id,
  });
  return { institution: inst, deptA: a, deptB: b };
}

/** @deprecated Prefer seedTenantGraph — kept for isolation suite compatibility. */
export async function seedTenantFixture(
  db: TestDb,
  label: string,
): Promise<TenantFixture> {
  const g = await seedTenantGraph(db, {
    sku: 'department',
    label,
    withQuiz: true,
    withStudent: true,
  });
  return {
    workspaceId: g.workspaceId,
    professorId: g.leadId,
    studentId: g.studentId!,
    courseId: g.courseId,
    sectionId: g.sectionId,
    quizId: g.quizId,
    assignmentId: g.assignmentId,
    attemptId: g.attemptId,
    offeringId: g.offeringId,
    ownerId: g.ownerId,
    institutionId: g.institutionId,
    sku: g.sku,
  };
}

export async function cleanupTenantFixture(
  db: TestDb,
  fixture: TenantFixture | TenantGraph,
): Promise<void> {
  const ids = [fixture.workspaceId];
  if (fixture.institutionId) ids.push(fixture.institutionId);

  if (fixture.attemptId) {
    await db.delete(attempts).where(eq(attempts.id, fixture.attemptId));
  }
  if (fixture.assignmentId) {
    await db.delete(assignments).where(eq(assignments.id, fixture.assignmentId));
  }
  if (fixture.quizId) {
    await db.delete(quizSections).where(eq(quizSections.quizId, fixture.quizId));
    await db.delete(quizzes).where(eq(quizzes.id, fixture.quizId));
  }
  await db
    .delete(professorSections)
    .where(eq(professorSections.sectionId, fixture.sectionId));
  await db
    .delete(studentSections)
    .where(eq(studentSections.sectionId, fixture.sectionId));
  // All sections for the course (tests may add siblings) before offerings.
  await db.delete(sections).where(eq(sections.courseId, fixture.courseId));
  await db
    .delete(courseOfferings)
    .where(eq(courseOfferings.courseId, fixture.courseId));
  await db.delete(courses).where(eq(courses.id, fixture.courseId));
  await db
    .delete(roleBindings)
    .where(eq(roleBindings.tenantId, fixture.workspaceId));
  await db
    .delete(supportAccessGrants)
    .where(eq(supportAccessGrants.tenantId, fixture.workspaceId));
  await db
    .delete(workspaceLicenses)
    .where(eq(workspaceLicenses.workspaceId, fixture.workspaceId));
  await db
    .delete(workspaceMemberships)
    .where(eq(workspaceMemberships.workspaceId, fixture.workspaceId));

  const userIds = [
    fixture.professorId,
    fixture.ownerId,
    fixture.studentId,
    'leadId' in fixture ? (fixture as TenantGraph).leadId : null,
  ].filter(Boolean) as string[];
  const uniqueUsers = [...new Set(userIds)];
  if (uniqueUsers.length) {
    await db.delete(users).where(inArray(users.id, uniqueUsers));
  }

  await db.delete(workspaces).where(eq(workspaces.id, fixture.workspaceId));
}

export async function grantSupportAccess(
  db: TestDb,
  opts: {
    tenantId: string;
    userId: string;
    grantedBy: string;
    expiresAt?: Date;
    reason?: string;
  },
) {
  const [row] = await db
    .insert(supportAccessGrants)
    .values({
      tenantId: opts.tenantId,
      userId: opts.userId,
      grantedBy: opts.grantedBy,
      expiresAt: opts.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      reason: opts.reason ?? 'test support grant',
    })
    .returning();
  return row!;
}

export { randomSlug };
