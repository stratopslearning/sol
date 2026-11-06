import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { courses, users } from '@/app/db/schema';
import { withRequestTenant } from '@/lib/db/requestTenant';
import { withTenant } from '@/lib/db/tenantContext';
import { cloneCourseKnowledgeLinks } from '@/lib/knowledge/documents';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import { hasActiveSupportAccess } from '@/lib/authz/supportAccess';
import { bindLeadInstructor, ensureOffering } from '@/lib/offerings/create';
import { createSectionForCourse } from '@/lib/professor/createSection';
import {
  assertWorkspaceAllowsCourseCreate,
  getActiveWorkspaceId,
  userCanCreateCoursesInWorkspace,
} from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const createCourseSchema = z.object({
  title: z
    .string()
    .min(1, 'Course title is required')
    .max(100, 'Course title too long'),
  description: z.string().optional(),
  workspaceId: z.string().uuid().optional(),
  /** Default true: create a first section and enroll the professor. */
  createDefaultSection: z.boolean().optional(),
  sectionName: z.string().min(1).max(100).optional(),
  /** Clone pinned Knowledge attachments from another course you manage. */
  cloneKnowledgeFromCourseId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createCourseSchema.parse(body);

    // Authorization comes from role bindings (catalog.create_course), never users.role.
    // Platform staff (users.platform_staff) may only act with an active support grant.
    const isStaff = Boolean(user.platformStaff);
    let workspaceId = validatedData.workspaceId;
    if (isStaff) {
      if (!workspaceId) {
        return NextResponse.json(
          { error: 'workspaceId is required for platform-staff course create' },
          { status: 400 },
        );
      }
      if (!(await hasActiveSupportAccess(user.id, workspaceId))) {
        return NextResponse.json(
          { error: 'Support access required for this workspace' },
          { status: 403 },
        );
      }
    } else {
      if (!workspaceId) {
        workspaceId = (await getActiveWorkspaceId(user.id)) ?? undefined;
      }
      if (!workspaceId) {
        return NextResponse.json(
          {
            error:
              'No workspace selected. Choose a workspace or pass workspaceId.',
          },
          { status: 403 },
        );
      }
      const allowed = await userCanCreateCoursesInWorkspace(user.id, workspaceId);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Forbidden - not allowed to create courses in this workspace' },
          { status: 403 },
        );
      }
    }

    const entitlement = await assertWorkspaceAllowsCourseCreate(workspaceId);
    if (!entitlement.ok) {
      return NextResponse.json(
        { error: entitlement.reason, code: entitlement.code },
        { status: entitlement.code === 'billing_required' ? 402 : 403 },
      );
    }

    type CourseRow = typeof courses.$inferSelect;

    const insertCourse = async (
      tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    ) => {
      const [row] = await tx
        .insert(courses)
        .values({
          workspaceId,
          tenantId: workspaceId,
          title: validatedData.title,
          description: validatedData.description || null,
          status: 'ACTIVE',
          isActive: true,
        })
        .returning();
      await ensureOffering(tx, {
        courseId: row!.id,
        tenantId: workspaceId!,
      });
      return row!;
    };

    const newCourse: CourseRow =
      isStaff
        ? await withTenant(workspaceId, user.id, insertCourse)
        : await withRequestTenant(user, insertCourse, workspaceId);

    // Lead bind under tenant GUC (upsertRoleBinding uses global db).
    if (!isStaff) {
      await withTenant(workspaceId, user.id, async (tx) => {
        const offering = await ensureOffering(tx, {
          courseId: newCourse.id,
          tenantId: workspaceId!,
        });
        await bindLeadInstructor({
          tenantId: workspaceId!,
          offeringId: offering.id,
          userId: user.id,
        });
      });
    }

    const createDefaultSection = validatedData.createDefaultSection !== false;
    let section: Awaited<ReturnType<typeof createSectionForCourse>> | null =
      null;
    if (createDefaultSection && !isStaff) {
      section = await createSectionForCourse(user, {
        courseId: newCourse.id,
        name: validatedData.sectionName?.trim() || 'Main',
      });
    }

    let clonedKnowledgeLinks = 0;
    if (validatedData.cloneKnowledgeFromCourseId) {
      await assertCanManageCourse(
        user,
        validatedData.cloneKnowledgeFromCourseId,
      );
      clonedKnowledgeLinks = await cloneCourseKnowledgeLinks(
        validatedData.cloneKnowledgeFromCourseId,
        newCourse.id,
        user.id,
      );
    }

    return NextResponse.json({
      success: true,
      course: {
        id: newCourse.id,
        title: newCourse.title,
        description: newCourse.description,
        status: newCourse.status,
        workspaceId: newCourse.workspaceId,
        createdAt: newCourse.createdAt,
      },
      section,
      clonedKnowledgeLinks,
      message: 'Course created successfully',
    });
  } catch (error) {
    console.error('Error creating course:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 },
    );
  }
}
