import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { readJsonBody } from '@/lib/api/readJsonBody';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { listTeachableCourses } from '@/lib/knowledge';
import { ACTIVE_COURSE_COOKIE } from '@/lib/professor/activeCourse';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  courseId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = bodySchema.parse(await readJsonBody(req));
  const courses = await listTeachableCourses(user);
  const allowed = courses.some((c) => c.id === body.courseId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, courseId: body.courseId });
  res.cookies.set(ACTIVE_COURSE_COOKIE, body.courseId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
