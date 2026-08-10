import { NextRequest, NextResponse } from 'next/server';

import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { revokeProfessorApiToken } from '@/lib/professorApiTokens';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ tokenId: string }> },
) {
  try {
    const user = await getOrCreateUser();
    if (!user) throw ApiError.unauthorized();
    if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
      throw ApiError.forbidden();
    }

    const { tokenId } = await context.params;
    const revoked = await revokeProfessorApiToken({
      userId: user.id,
      tokenId,
    });
    if (!revoked) {
      throw ApiError.notFound('Token not found or already revoked');
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'professor.api_token.revoke',
      targetType: 'api_token',
      targetId: tokenId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
