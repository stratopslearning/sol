import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { professorSections, sections } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { activeOnly } from '@/lib/db/filters';
import { getProfessorSectionDetail } from '@/lib/professor/sections';
import { parseOptionalEndsAt } from '@/lib/sectionAvailability';

export const dynamic = 'force-dynamic';

/** Section detail (roster, codes, quizzes, discussions) for teaching faculty. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sectionId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });

    const limited = await enforceRateLimit({
      key: `professor-read:${auth.user.id}`,
      limit: 120,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const { sectionId } = await context.params;
    const detail = await getProfessorSectionDetail(auth.user, sectionId);
    return NextResponse.json(detail);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({
  endsAt: z.union([z.string(), z.null()]).optional(),
});

/**
 * Teaching professors (and admins) can set/clear section endsAt.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ sectionId: string }> },
) {
  try {
    const { sectionId } = await context.params;
    const auth = await requireProfessorApi(req, { scope: 'sections:write' });
    const user = auth.user;

    if (user.role === 'PROFESSOR') {
      const enrollment = await db.query.professorSections.findFirst({
        where: and(
          eq(professorSections.sectionId, sectionId),
          eq(professorSections.professorId, user.id),
        ),
      });
      if (!enrollment) {
        return NextResponse.json(
          { error: 'You can only update sections you teach' },
          { status: 403 },
        );
      }
    }

    const section = await db.query.sections.findFirst({
      where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
    });
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 },
      );
    }

    if (!('endsAt' in (body ?? {}))) {
      return NextResponse.json(
        { error: 'endsAt is required (ISO string or null to clear)' },
        { status: 400 },
      );
    }

    const endsAtResult = parseOptionalEndsAt(parsed.data.endsAt ?? null);
    if (!endsAtResult.ok) {
      return NextResponse.json({ error: endsAtResult.error }, { status: 400 });
    }

    const [updated] = await db
      .update(sections)
      .set({
        endsAt: endsAtResult.endsAt,
        updatedAt: new Date(),
      })
      .where(eq(sections.id, sectionId))
      .returning();

    return NextResponse.json({ success: true, section: updated });
  } catch (error) {
    console.error('Professor section PATCH error:', error);
    return apiErrorResponse(error);
  }
}
