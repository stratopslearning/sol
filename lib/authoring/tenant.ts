import { ApiError } from '@/lib/api/errors';
import {
  fetchCourseById,
  fetchOutlineById,
  fetchOutlineItemById,
} from '@/lib/db/entityScopedReads';
import { withTenant } from '@/lib/db/tenantContext';
import type { db } from '@/app/db';

type Tx = Parameters<Parameters<typeof withTenant>[2]>[0];

/** Resolve tenant id for a course (DEFINER course lookup). */
export async function resolveCourseTenantId(courseId: string): Promise<string> {
  const course = await fetchCourseById(courseId);
  const tenantId = course?.tenantId ?? course?.workspaceId;
  if (!tenantId) {
    throw ApiError.badRequest('Course is missing tenant_id');
  }
  return tenantId;
}

/** Resolve tenant id for an outline (DEFINER outline lookup → course). */
export async function resolveOutlineTenantId(
  outlineId: string,
): Promise<{ tenantId: string; courseId: string; outline: NonNullable<
  Awaited<ReturnType<typeof fetchOutlineById>>
> }> {
  const outline = await fetchOutlineById(outlineId);
  if (!outline) throw ApiError.notFound('Outline not found');
  const tenantId =
    outline.tenantId ?? (await resolveCourseTenantId(outline.courseId));
  return { tenantId, courseId: outline.courseId, outline };
}

/** Resolve tenant id for an outline item (DEFINER item lookup). */
export async function resolveItemTenantId(itemId: string): Promise<{
  tenantId: string;
  courseId: string;
  outlineId: string;
  item: NonNullable<Awaited<ReturnType<typeof fetchOutlineItemById>>>;
}> {
  const item = await fetchOutlineItemById(itemId);
  if (!item) throw ApiError.notFound('Outline item not found');
  const tenantId =
    item.tenantId ?? (await resolveCourseTenantId(item.courseId));
  return {
    tenantId,
    courseId: item.courseId,
    outlineId: item.outlineId,
    item,
  };
}

/** Run work with FORCE RLS GUC pinned for a course. */
export async function withCourseTenant<T>(
  courseId: string,
  userId: string | null,
  fn: (tx: Tx, tenantId: string) => Promise<T>,
): Promise<T> {
  const tenantId = await resolveCourseTenantId(courseId);
  return withTenant(tenantId, userId, (tx) => fn(tx, tenantId));
}

/** Run work with FORCE RLS GUC pinned for an outline's tenant. */
export async function withOutlineTenant<T>(
  outlineId: string,
  userId: string | null,
  fn: (
    tx: Tx,
    ctx: {
      tenantId: string;
      courseId: string;
      outline: NonNullable<Awaited<ReturnType<typeof fetchOutlineById>>>;
    },
  ) => Promise<T>,
): Promise<T> {
  const ctx = await resolveOutlineTenantId(outlineId);
  return withTenant(ctx.tenantId, userId, (tx) => fn(tx, ctx));
}

/** Run work with FORCE RLS GUC pinned for an outline item's tenant. */
export async function withItemTenant<T>(
  itemId: string,
  userId: string | null,
  fn: (
    tx: Tx,
    ctx: {
      tenantId: string;
      courseId: string;
      outlineId: string;
      item: NonNullable<Awaited<ReturnType<typeof fetchOutlineItemById>>>;
    },
  ) => Promise<T>,
): Promise<T> {
  const ctx = await resolveItemTenantId(itemId);
  return withTenant(ctx.tenantId, userId, (tx) => fn(tx, ctx));
}

export type AuthoringTx = Tx;
export type AuthoringDb = typeof db;
