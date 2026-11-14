import { NextResponse } from 'next/server';

import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { createInteractive } from '@/lib/interactives';
import type { InteractiveKind } from '@/app/db/schema';

export async function POST(req: Request) {
  try {
    const { user } = await requireProfessorApi(req);
    const body = await req.json();
    const kind = body.kind as InteractiveKind;
    if (!kind || !body.courseId || !body.title) {
      throw ApiError.badRequest('courseId, title, and kind are required');
    }
    const created = await createInteractive(user, {
      courseId: body.courseId,
      title: body.title,
      description: body.description,
      kind,
      body: body.body ?? {},
      sectionIds: body.sectionIds,
      isActive: body.isActive ?? false,
    });
    return NextResponse.json({ interactive: created });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
