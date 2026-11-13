import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import { knowledgeConnectors } from '@/app/db/schema';
import { apiErrorResponse, ApiError } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { withBasePath } from '@/lib/basePath';
import {
  buildConnectorAuthorizeUrl,
  isConnectorProviderConfigured,
} from '@/lib/knowledge';
import type { KnowledgeProvider } from '@/lib/knowledge';
import { assertWorkspaceFaculty } from '@/lib/knowledge/workspaceAccess';
import { absoluteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireProfessorApi(req, {
      scope: 'materials:write',
      professorOnly: true,
    });
    const { id } = await ctx.params;
    const connector = await db.query.knowledgeConnectors.findFirst({
      where: and(
        eq(knowledgeConnectors.id, id),
        isNull(knowledgeConnectors.deletedAt),
      ),
    });
    if (!connector) throw ApiError.notFound('Connector not found');
    await assertWorkspaceFaculty(auth.user, connector.workspaceId);

    const provider = connector.provider as KnowledgeProvider;
    if (!isConnectorProviderConfigured(provider)) {
      throw ApiError.badRequest(
        'This connector is not configured on the server yet. Ask your SOL admin to add the OAuth app credentials.',
      );
    }

    const redirectUri = absoluteUrl(
      '/api/professor/knowledge/connectors/oauth/callback',
    );
    const url = buildConnectorAuthorizeUrl({
      provider,
      workspaceId: connector.workspaceId,
      connectorId: connector.id,
      redirectUri,
    });

    // Browser navigation from Connections UI
    if (req.nextUrl.searchParams.get('redirect') === '1') {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({
      url,
      redirectUri,
      returnPath: withBasePath(
        `/dashboard/workspace/knowledge?tab=connections&workspaceId=${connector.workspaceId}`,
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
