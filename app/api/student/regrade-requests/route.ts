import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { userCanAccessLearningArea } from '@/lib/authz';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { createRegradeRequest } from '@/lib/regradeRequests';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  attemptId: z.string().uuid(),
  note: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await userCanAccessLearningArea(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = bodySchema.parse(await readJsonBody(req));
    const row = await createRegradeRequest({
      attemptId: body.attemptId,
      studentId: user.id,
      note: body.note,
    });
    return NextResponse.json({ request: row }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
