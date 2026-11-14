import { NextRequest, NextResponse } from 'next/server';

import { ApiError, jsonError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { enrollInSection } from '@/lib/professor/mutations';

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
      return NextResponse.json(
        { error: 'Enrollment code is required' },
        { status: 400 },
      );
    }

    const section = await enrollInSection(
      user,
      enrollmentCode,
      typeof body.workspaceId === 'string' ? body.workspaceId : undefined,
    );

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in section',
      section: {
        id: section.id,
        name: section.name,
        courseId: section.courseId,
      },
    });
  } catch (error) {
    console.error('Professor enrollment error:', error);
    if (error instanceof ApiError) return jsonError(error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}
