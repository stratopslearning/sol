import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import {
  listVersionsForUser,
  reprocessDocumentForUser,
  shareDocumentToLibrary,
  softDeleteKnowledgeDocument,
} from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, { scope: 'read' });
    const { id } = await ctx.params;
    const versions = await listVersionsForUser(auth.user, id);
    return NextResponse.json({ versions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;
    const { id } = await ctx.params;
    await softDeleteKnowledgeDocument(auth.user, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Reprocess current version, or share personal → library. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const limited = await enforceRateLimit({
      key: `professor-knowledge-write:${auth.user.id}`,
      limit: 20,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;
    const { id } = await ctx.params;
    const action = req.nextUrl.searchParams.get('action') ?? 'reprocess';
    if (action === 'reprocess') {
      await reprocessDocumentForUser(auth.user, id);
      return NextResponse.json({ success: true });
    }
    if (action === 'share') {
      const document = await shareDocumentToLibrary(auth.user, id);
      return NextResponse.json({ document });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
