import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { courses } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { parseAiPolicy } from '@/lib/chatbot/aiPolicy';
import { assertCanManageCourse } from '@/lib/knowledge/access';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  aiPolicy: z
    .object({
      mode: z.enum(['hints', 'guided', 'full_after_submit']),
    })
    .nullable()
    .optional(),
  subject: z.string().min(1).max(120).optional(),
  level: z.string().min(1).max(80).optional(),
  feedbackTone: z.string().min(1).max(80).optional(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { courseId } = await ctx.params;
    await assertCanManageCourse(auth.user, courseId);

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      columns: {
        id: true,
        title: true,
        subject: true,
        level: true,
        feedbackTone: true,
        aiPolicy: true,
      },
    });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json({ course });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'authoring:write' });
    const { courseId } = await ctx.params;
    await assertCanManageCourse(auth.user, courseId);
    const body = patchSchema.parse(await readJsonBody(req));

    const patch: {
      aiPolicy?: ReturnType<typeof parseAiPolicy>;
      subject?: string;
      level?: string;
      feedbackTone?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (body.aiPolicy !== undefined) {
      const parsed = body.aiPolicy ? parseAiPolicy(body.aiPolicy) : null;
      if (body.aiPolicy && !parsed) {
        return NextResponse.json({ error: 'Invalid aiPolicy' }, { status: 400 });
      }
      patch.aiPolicy = parsed;
    }
    if (body.subject !== undefined) patch.subject = body.subject.trim();
    if (body.level !== undefined) patch.level = body.level.trim();
    if (body.feedbackTone !== undefined) {
      patch.feedbackTone = body.feedbackTone.trim();
    }

    if (
      body.aiPolicy === undefined &&
      body.subject === undefined &&
      body.level === undefined &&
      body.feedbackTone === undefined
    ) {
      return NextResponse.json({ ok: true });
    }

    const [updated] = await db
      .update(courses)
      .set(patch)
      .where(eq(courses.id, courseId))
      .returning({
        id: courses.id,
        aiPolicy: courses.aiPolicy,
        subject: courses.subject,
        level: courses.level,
        feedbackTone: courses.feedbackTone,
      });

    return NextResponse.json({ ok: true, course: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
