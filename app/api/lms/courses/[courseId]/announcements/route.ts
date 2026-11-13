import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { requireTeachingAccess } from '@/lib/authz/gates';
import {
  createCourseAnnouncementDefiner,
  listCourseAnnouncementsDefiner,
} from '@/lib/db/lmsDefiners';
import { assertCanManageCourse } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const user = await requireTeachingAccess();
    const { courseId } = await ctx.params;
    await assertCanManageCourse(user, courseId);
    return NextResponse.json({
      announcements: await listCourseAnnouncementsDefiner(courseId),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const user = await requireTeachingAccess();
    const { courseId } = await ctx.params;
    await assertCanManageCourse(user, courseId);
    const body = (await readJsonBody(req)) as {
      title?: string;
      bodyMarkdown?: string;
      publish?: boolean;
    };
    const announcement = await createCourseAnnouncementDefiner({
      courseId,
      authorUserId: user.id,
      title: body.title,
      bodyMarkdown: body.bodyMarkdown,
      publish: body.publish ?? true,
    });
    return NextResponse.json({ announcement });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
