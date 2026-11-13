import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { readJsonBody } from '@/lib/api/readJsonBody';
import {
  approveQuestionRubric,
  proposeQuestionRubric,
  testRubricSampleSeparation,
} from '@/lib/authoring/rubricApprove';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const sampleSchema = z.object({
  band: z.enum(['good', 'partial', 'bad']),
  answer: z.string().min(1).max(8_000),
});

const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('propose') }),
  z.object({
    action: z.literal('test'),
    samples: z.array(sampleSchema).min(3).max(6),
  }),
  z.object({
    action: z.literal('approve'),
    samples: z.array(sampleSchema).min(3).max(6).optional(),
  }),
]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ questionId: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'grades:write' });
    const { questionId } = await ctx.params;
    const body = postSchema.parse(await readJsonBody(req));

    if (body.action === 'propose') {
      const result = await proposeQuestionRubric({
        questionId,
        actorUserId: auth.user.id,
      });
      return NextResponse.json(result);
    }
    if (body.action === 'test') {
      const result = await testRubricSampleSeparation({
        questionId,
        samples: body.samples,
      });
      return NextResponse.json(result);
    }
    const result = await approveQuestionRubric({
      questionId,
      actorUserId: auth.user.id,
      samples: body.samples,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
