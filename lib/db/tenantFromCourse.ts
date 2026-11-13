import { and, eq } from 'drizzle-orm';

import type { db } from '@/app/db';
import { courseOfferings, courses, sections } from '@/app/db/schema';

/** Drizzle client or transaction — both expose `.query`. */
export type TenantDb = Pick<typeof db, 'query'>;

/** Denormalized workspace id for a course (never trust client input). */
export async function tenantIdFromCourse(
  client: TenantDb,
  courseId: string,
): Promise<string | null> {
  const course = await client.query.courses.findFirst({
    where: eq(courses.id, courseId),
    columns: { workspaceId: true },
  });
  return course?.workspaceId ?? null;
}

/** Default or named offering for a course. */
export async function offeringIdFromCourse(
  client: TenantDb,
  courseId: string,
  termLabel = 'default',
): Promise<string | null> {
  const offering = await client.query.courseOfferings.findFirst({
    where: and(
      eq(courseOfferings.courseId, courseId),
      eq(courseOfferings.termLabel, termLabel),
    ),
    columns: { id: true },
  });
  return offering?.id ?? null;
}

export async function tenantAndOfferingFromCourse(
  client: TenantDb,
  courseId: string,
  termLabel = 'default',
): Promise<{ tenantId: string | null; offeringId: string | null }> {
  const [tenantId, offeringId] = await Promise.all([
    tenantIdFromCourse(client, courseId),
    offeringIdFromCourse(client, courseId, termLabel),
  ]);
  return { tenantId, offeringId };
}

/** Resolve denormalized keys from a section row (for quiz assign paths). */
export async function tenantOfferingFromSection(
  client: TenantDb,
  sectionId: string,
): Promise<{ tenantId: string | null; offeringId: string | null }> {
  const section = await client.query.sections.findFirst({
    where: eq(sections.id, sectionId),
    columns: {
      tenantId: true,
      offeringId: true,
      courseId: true,
      workspaceId: true,
    },
  });
  if (!section) {
    return { tenantId: null, offeringId: null };
  }
  const tenantId =
    section.tenantId ??
    section.workspaceId ??
    (section.courseId
      ? await tenantIdFromCourse(client, section.courseId)
      : null);
  const offeringId =
    section.offeringId ??
    (section.courseId
      ? await offeringIdFromCourse(client, section.courseId)
      : null);
  return { tenantId, offeringId };
}
