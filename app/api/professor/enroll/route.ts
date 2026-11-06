import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { professorSections } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { upsertRoleBinding } from '@/lib/authz/bindings';
import { findSectionByProfessorCode } from '@/lib/sections/enrollmentLookup';
import { resolveProfessorEnrollWorkspaceId } from '@/lib/workspace';
import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireProfessorApi(req, {
      scope: 'sections:write',
      professorOnly: true,
    });

    const limited = await enforceRateLimit({
      key: `enroll-professor:${user.id}`,
      limit: 10,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many enrollment attempts. Please wait a moment.',
    });
    if (limited) return limited;

    const body = (await readJsonBody(req)) as {
      enrollmentCode?: unknown;
      workspaceId?: unknown;
    };
    const { enrollmentCode } = body;
    if (!enrollmentCode || typeof enrollmentCode !== 'string') {
      return NextResponse.json({ error: 'Enrollment code is required' }, { status: 400 });
    }

    const workspaceScope = await resolveProfessorEnrollWorkspaceId(
      user.id,
      typeof body.workspaceId === 'string' ? body.workspaceId : undefined,
    );
    if (!workspaceScope.ok) {
      return NextResponse.json(
        { error: workspaceScope.error },
        { status: workspaceScope.status },
      );
    }

    const section = await findSectionByProfessorCode(
      workspaceScope.workspaceId,
      enrollmentCode,
    );

    if (!section) {
      return NextResponse.json({ error: 'Invalid enrollment code' }, { status: 404 });
    }

    // Check if already enrolled
    const existing = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.sectionId, section.id),
        eq(professorSections.professorId, user.id)
      )
    });

    if (existing) {
      return NextResponse.json({ error: 'Already enrolled in this section' }, { status: 400 });
    }

    // Enroll the professor
    await db.insert(professorSections).values({
      professorId: user.id,
      sectionId: section.id,
    });

    const { ensureWorkspaceMembership, getCourseWorkspaceId } = await import(
      '@/lib/workspace'
    );
    const workspaceId = await getCourseWorkspaceId(section.courseId);
    if (workspaceId) {
      // Seat only; teaching power comes from the section-scope binding below.
      await ensureWorkspaceMembership({ workspaceId, userId: user.id });
      // Joining with the professor enrollment code grants co-instructor on this section.
      await upsertRoleBinding({
        tenantId: workspaceId,
        userId: user.id,
        scopeType: 'section',
        scopeId: section.id,
        role: 'co_instructor',
        grantedBy: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in section',
      section: {
        id: section.id,
        name: section.name,
        courseId: section.courseId
      }
    });
  } catch (error) {
    console.error('Professor enrollment error:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
} 