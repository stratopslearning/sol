import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import {
  addActivityToSection,
  setActivitySections,
} from '@/lib/professor/setActivitySections';

export const dynamic = 'force-dynamic';

const setSchema = z.object({
  type: z.enum(['QUIZ', 'DISCUSSION', 'INTERACTIVE', 'LESSON']),
  entityId: z.string().uuid(),
  sectionIds: z.array(z.string().uuid()),
  mode: z.enum(['replace', 'add']).optional().default('replace'),
  /** Required when mode=add (single section to append). */
  sectionId: z.string().uuid().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireProfessorApi(req, {
      scope: 'sections:write',
    });
    const limited = await enforceRateLimit({
      key: `activity-sections:${user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many assign requests. Please wait a moment.',
    });
    if (limited) return limited;

    const body = setSchema.parse(await readJsonBody(req));

    if (body.mode === 'add') {
      const sectionId = body.sectionId ?? body.sectionIds[0];
      if (!sectionId) {
        throw ApiError.badRequest('sectionId required for add mode');
      }
      await addActivityToSection(user, {
        type: body.type,
        entityId: body.entityId,
        sectionId,
      });
      return NextResponse.json({ success: true, sectionIds: [sectionId] });
    }

    const result = await setActivitySections(user, {
      type: body.type,
      entityId: body.entityId,
      sectionIds: body.sectionIds,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    console.error('activity sections error:', error);
    return NextResponse.json(
      { error: 'Failed to update sections' },
      { status: 500 },
    );
  }
}
