import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { copyOfferingFromSource } from '@/lib/authoring/copyOffering';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sourceOfferingId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ offeringId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'authoring:write' });
    const { offeringId } = await ctx.params;
    const body = bodySchema.parse(await readJsonBody(req));
    const result = await copyOfferingFromSource(
      auth.user,
      offeringId,
      body.sourceOfferingId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
