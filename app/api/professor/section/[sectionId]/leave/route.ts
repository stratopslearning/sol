import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { professorSections, users } from '@/app/db/schema';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { extractRequestMeta, logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sectionId: string }> },
) {
  try {
    const { userId } = getAuth(req);
    if (!userId) throw ApiError.unauthorized();
    const { sectionId } = await context.params;

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!user) throw ApiError.unauthorized('User not found');

    if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
      throw ApiError.forbidden();
    }

    const limited = await enforceRateLimit({
      key: `professor-leave:${user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
      message: 'Too many leave requests. Please wait a moment.',
    });
    if (limited) return limited;

    const enrollment = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.sectionId, sectionId),
        eq(professorSections.professorId, user.id),
      ),
    });
    if (!enrollment) {
      throw ApiError.badRequest('Not enrolled in this section');
    }

    await db
      .delete(professorSections)
      .where(
        and(
          eq(professorSections.sectionId, sectionId),
          eq(professorSections.professorId, user.id),
        ),
      );

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'education.professor_enrollment.leave',
      targetType: 'section',
      targetId: sectionId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
