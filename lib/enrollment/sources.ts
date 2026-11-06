import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courseOfferings,
  sections,
  studentOfferings,
  studentSections,
} from '@/app/db/schema';

export type EnrollmentSource = 'lti' | 'code' | 'csv' | 'invite';

export function normalizeEnrollmentSources(
  raw: unknown,
): EnrollmentSource[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<EnrollmentSource>(['lti', 'code', 'csv', 'invite']);
  const out: EnrollmentSource[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && allowed.has(item as EnrollmentSource)) {
      if (!out.includes(item as EnrollmentSource)) {
        out.push(item as EnrollmentSource);
      }
    }
  }
  return out;
}

export function appendEnrollmentSource(
  existing: unknown,
  source: EnrollmentSource,
): EnrollmentSource[] {
  const list = normalizeEnrollmentSources(existing);
  if (!list.includes(source)) list.push(source);
  return list;
}

export function removeEnrollmentSource(
  existing: unknown,
  source: EnrollmentSource,
): EnrollmentSource[] {
  return normalizeEnrollmentSources(existing).filter((s) => s !== source);
}

export type UpsertStudentEnrollmentInput = {
  studentId: string;
  sectionId: string;
  source: EnrollmentSource;
  tenantId?: string | null;
  offeringId?: string | null;
  /** When true, offering dual-write failures are logged only (LTI/NRPS). Default fail-closed. */
  bestEffortOfferingSync?: boolean;
};

export type UpsertStudentEnrollmentResult = {
  enrollmentId: string;
  created: boolean;
  reactivated: boolean;
  sources: EnrollmentSource[];
};

/**
 * Dual-write (0046): mirror a section enrollment onto student_offerings.
 * Fail-closed by default; LTI/NRPS may pass bestEffort.
 */
async function syncStudentOffering(opts: {
  tenantId: string | null | undefined;
  studentId: string;
  offeringId: string | null | undefined;
  source: EnrollmentSource;
  bestEffort?: boolean;
}): Promise<void> {
  if (!opts.tenantId || !opts.offeringId) return;
  try {
    const existing = await db.query.studentOfferings.findFirst({
      where: and(
        eq(studentOfferings.studentId, opts.studentId),
        eq(studentOfferings.offeringId, opts.offeringId),
      ),
    });
    if (existing) {
      await db
        .update(studentOfferings)
        .set({
          status: 'ACTIVE',
          sources: appendEnrollmentSource(existing.sources, opts.source),
          updatedAt: new Date(),
        })
        .where(eq(studentOfferings.id, existing.id));
      return;
    }
    await db
      .insert(studentOfferings)
      .values({
        tenantId: opts.tenantId,
        studentId: opts.studentId,
        offeringId: opts.offeringId,
        status: 'ACTIVE',
        sources: [opts.source],
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error('[enrollment] student_offerings dual-write failed', err);
    if (!opts.bestEffort) throw err;
  }
}

/** After a section drop, mark the offering enrollment DROPPED when no section remains ACTIVE. */
async function reconcileStudentOfferingAfterDrop(
  studentId: string,
  offeringId: string | null | undefined,
): Promise<void> {
  if (!offeringId) return;
  try {
    const stillActive = await db.query.studentSections.findFirst({
      where: and(
        eq(studentSections.studentId, studentId),
        eq(studentSections.offeringId, offeringId),
        eq(studentSections.status, 'ACTIVE'),
      ),
      columns: { id: true },
    });
    if (stillActive) return;
    await db
      .update(studentOfferings)
      .set({ status: 'DROPPED', sources: [], updatedAt: new Date() })
      .where(
        and(
          eq(studentOfferings.studentId, studentId),
          eq(studentOfferings.offeringId, offeringId),
        ),
      );
  } catch (err) {
    console.error('[enrollment] student_offerings drop sync failed', err);
  }
}

/** Idempotent enroll: one row per student+section; sources accumulate. */
export async function upsertStudentEnrollment(
  input: UpsertStudentEnrollmentInput,
): Promise<UpsertStudentEnrollmentResult> {
  const section = await db.query.sections.findFirst({
    where: eq(sections.id, input.sectionId),
    columns: {
      id: true,
      tenantId: true,
      offeringId: true,
      courseId: true,
    },
  });
  if (!section) {
    throw new Error('Section not found');
  }

  const tenantId =
    input.tenantId ?? section.tenantId ?? null;
  let offeringId = input.offeringId ?? section.offeringId ?? null;
  if (!offeringId) {
    const offering = await db.query.courseOfferings.findFirst({
      where: eq(courseOfferings.courseId, section.courseId),
      columns: { id: true },
    });
    offeringId = offering?.id ?? null;
  }

  const existing = await db.query.studentSections.findFirst({
    where: and(
      eq(studentSections.studentId, input.studentId),
      eq(studentSections.sectionId, input.sectionId),
    ),
  });

  const sources = appendEnrollmentSource(
    existing?.sources ?? [],
    input.source,
  );

  if (existing) {
    const reactivated = existing.status !== 'ACTIVE';
    const [row] = await db
      .update(studentSections)
      .set({
        status: 'ACTIVE',
        sources,
        tenantId: tenantId ?? existing.tenantId,
        offeringId: offeringId ?? existing.offeringId,
      })
      .where(eq(studentSections.id, existing.id))
      .returning({ id: studentSections.id });
    await syncStudentOffering({
      tenantId: tenantId ?? existing.tenantId,
      studentId: input.studentId,
      offeringId: offeringId ?? existing.offeringId,
      source: input.source,
      bestEffort: input.bestEffortOfferingSync,
    });
    return {
      enrollmentId: row.id,
      created: false,
      reactivated,
      sources,
    };
  }

  const [row] = await db
    .insert(studentSections)
    .values({
      studentId: input.studentId,
      sectionId: input.sectionId,
      status: 'ACTIVE',
      sources,
      tenantId,
      offeringId,
    })
    .returning({ id: studentSections.id });

  await syncStudentOffering({
    tenantId,
    studentId: input.studentId,
    offeringId,
    source: input.source,
    bestEffort: input.bestEffortOfferingSync,
  });

  return {
    enrollmentId: row.id,
    created: true,
    reactivated: false,
    sources,
  };
}

/** After an external roster removes a learner, drop only when no sources remain. */
export async function applyEnrollmentSourceRemoval(opts: {
  studentId: string;
  sectionId: string;
  source: EnrollmentSource;
}): Promise<'dropped' | 'active' | 'missing'> {
  const existing = await db.query.studentSections.findFirst({
    where: and(
      eq(studentSections.studentId, opts.studentId),
      eq(studentSections.sectionId, opts.sectionId),
    ),
  });
  if (!existing) return 'missing';

  const sources = removeEnrollmentSource(existing.sources, opts.source);
  if (sources.length === 0) {
    await db
      .update(studentSections)
      .set({ status: 'DROPPED', sources: [] })
      .where(eq(studentSections.id, existing.id));
    await reconcileStudentOfferingAfterDrop(opts.studentId, existing.offeringId);
    return 'dropped';
  }

  await db
    .update(studentSections)
    .set({ sources })
    .where(eq(studentSections.id, existing.id));
  return 'active';
}
