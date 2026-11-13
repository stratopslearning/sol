import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { listOutlinesForCourse } from '@/lib/authoring/outlines';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { assertCanManageCourse } from '@/lib/knowledge';
import { backfillModulesFromOutline } from '@/lib/lms/modules';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const user = await requireTeachingAccess();
    const { courseId } = await ctx.params;
    await assertCanManageCourse(user, courseId);
    const body = (await readJsonBody(req)) as { outlineId?: string };
    let outlineId = body.outlineId;
    if (!outlineId) {
      const outlines = await listOutlinesForCourse(user, courseId);
      outlineId = outlines[0]?.id;
    }
    if (!outlineId) {
      return NextResponse.json(
        { error: 'No outline found for this course' },
        { status: 400 },
      );
    }
    const result = await backfillModulesFromOutline(outlineId);
    return NextResponse.json({ result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
