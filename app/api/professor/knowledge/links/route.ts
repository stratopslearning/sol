import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  acceptLinkedDocumentUpdate,
  dismissLinkedDocumentUpdate,
  linkDocumentToCourse,
  setLinkedDocumentAuthoringCorpus,
  unlinkDocumentFromCourse,
} from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  courseId: z.string().uuid(),
  documentId: z.string().uuid(),
  authoringCorpus: z.enum(['prior_course', 'this_term']).optional(),
});

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('corpus'),
    courseId: z.string().uuid(),
    documentId: z.string().uuid(),
    authoringCorpus: z.enum(['prior_course', 'this_term']),
  }),
  z.object({
    action: z.literal('accept_update'),
    courseId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('dismiss_update'),
    courseId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const body = bodySchema.parse(await req.json());
    await linkDocumentToCourse(auth.user, body.courseId, body.documentId, {
      authoringCorpus: body.authoringCorpus,
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const raw = await req.json();
    // Backward compatible: { courseId, documentId, authoringCorpus } without action
    const normalized =
      raw && typeof raw === 'object' && !('action' in raw) && raw.authoringCorpus
        ? { action: 'corpus' as const, ...raw }
        : raw;
    const body = patchSchema.parse(normalized);

    if (body.action === 'corpus') {
      await setLinkedDocumentAuthoringCorpus(
        auth.user,
        body.courseId,
        body.documentId,
        body.authoringCorpus,
      );
    } else if (body.action === 'accept_update') {
      await acceptLinkedDocumentUpdate(
        auth.user,
        body.courseId,
        body.documentId,
      );
    } else {
      await dismissLinkedDocumentUpdate(
        auth.user,
        body.courseId,
        body.documentId,
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 60,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const body = bodySchema.parse(await req.json());
    await unlinkDocumentFromCourse(auth.user, body.courseId, body.documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
