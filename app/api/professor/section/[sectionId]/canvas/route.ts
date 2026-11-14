import { NextRequest, NextResponse } from 'next/server';

import { requireProfessorApi } from '@/lib/api/professorAuth';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';
import { extractRequestMeta } from '@/lib/audit';
import { getLtiConfig } from '@/lib/lti/config';
import {
  getSectionLink,
  linkSectionToCanvas,
  unlinkSectionFromCanvas,
} from '@/lib/lti/links';
import { syncRosterForSectionLink } from '@/lib/lti/nrps';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ sectionId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireProfessorApi(req);
    const { sectionId } = await ctx.params;
    const cfg = getLtiConfig();
    const link = await getSectionLink(sectionId);
    return NextResponse.json({
      enabled: cfg.enabled,
      link: link
        ? {
            id: link.id,
            canvasCourseId: link.canvasCourseId,
            canvasSectionId: link.canvasSectionId,
            hasAgs: Boolean(link.agsLineItemsUrl),
            hasNrps: Boolean(link.nrpsMembershipsUrl),
            updatedAt: link.updatedAt,
          }
        : null,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireProfessorApi(req);
    const cfg = getLtiConfig();
    if (!cfg.enabled) {
      throw ApiError.badRequest('Canvas LTI is not enabled on this deployment');
    }
    const { sectionId } = await ctx.params;
    const body = (await req.json()) as {
      canvasCourseId?: string;
      canvasSectionId?: string | null;
    };
    if (!body.canvasCourseId?.trim()) {
      throw ApiError.badRequest('canvasCourseId is required');
    }
    const meta = extractRequestMeta(req);
    const link = await linkSectionToCanvas(
      auth.user,
      {
        sectionId,
        canvasCourseId: body.canvasCourseId,
        canvasSectionId: body.canvasSectionId,
      },
      meta,
    );
    return NextResponse.json({
      link: {
        id: link.id,
        canvasCourseId: link.canvasCourseId,
        canvasSectionId: link.canvasSectionId,
        hasAgs: Boolean(link.agsLineItemsUrl),
        hasNrps: Boolean(link.nrpsMembershipsUrl),
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireProfessorApi(req);
    const { sectionId } = await ctx.params;
    const meta = extractRequestMeta(req);
    await unlinkSectionFromCanvas(auth.user, sectionId, meta);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireProfessorApi(req);
    const cfg = getLtiConfig();
    if (!cfg.enabled) {
      throw ApiError.badRequest('Canvas LTI is not enabled on this deployment');
    }
    const { sectionId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action !== 'sync-roster') {
      throw ApiError.badRequest('Unsupported action');
    }
    const link = await getSectionLink(sectionId);
    if (!link) throw ApiError.notFound('Section is not linked to Canvas');
    const result = await syncRosterForSectionLink(link, {
      actorUserId: auth.user.id,
      actorClerkId: auth.user.clerkId,
    });
    return NextResponse.json({ result });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
