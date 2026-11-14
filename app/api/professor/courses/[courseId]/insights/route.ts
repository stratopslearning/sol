import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { readJsonBody } from '@/lib/api/readJsonBody';
import {
  analyzeUnitInsights,
  listUnitInsights,
} from '@/lib/insights/analyzeUnit';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import { getCourseWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const postSchema = z.object({
  outlineId: z.string().uuid().optional(),
  moduleId: z.string().uuid().optional(),
  quizIds: z.array(z.string().uuid()).optional(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { courseId } = await ctx.params;
    await assertCanManageCourse(auth.user, courseId);
    const tenantId = await getCourseWorkspaceId(courseId);
    if (!tenantId) {
      return NextResponse.json({ insights: [] });
    }
    const insights = await listUnitInsights({ tenantId, courseId });
    return NextResponse.json({ insights });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'authoring:write' });
    const { courseId } = await ctx.params;
    await assertCanManageCourse(auth.user, courseId);
    const tenantId = await getCourseWorkspaceId(courseId);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Course workspace not found' },
        { status: 400 },
      );
    }
    const body = postSchema.parse(await readJsonBody(req));
    const row = await analyzeUnitInsights({
      tenantId,
      courseId,
      outlineId: body.outlineId,
      moduleId: body.moduleId,
      quizIds: body.quizIds,
    });
    return NextResponse.json({ insight: row });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
