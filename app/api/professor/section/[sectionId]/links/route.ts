import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { assertTeachesSection } from '@/lib/professor/sections';
import {
  linkSection,
  listSectionLinks,
  unlinkSection,
} from '@/lib/sections/links';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
  externalKind: z.enum(['lti', 'alias']).default('alias'),
  externalId: z.string().min(1).max(256),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ sectionId: string }> };

export async function GET(req: NextRequest, context: Ctx) {
  try {
    const { sectionId } = await context.params;
    const auth = await requireProfessorApi(req, { scope: 'read' });
    await assertTeachesSection(auth.user, sectionId);
    return NextResponse.json({ links: await listSectionLinks(sectionId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, context: Ctx) {
  try {
    const { sectionId } = await context.params;
    const auth = await requireProfessorApi(req, { scope: 'sections:write' });
    await assertTeachesSection(auth.user, sectionId);
    const body = postSchema.parse(await readJsonBody(req));
    const { link, created } = await linkSection({
      solSectionId: sectionId,
      externalKind: body.externalKind,
      externalId: body.externalId,
      metadata: body.metadata ?? null,
    });
    return NextResponse.json({ link, created }, { status: created ? 201 : 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const { sectionId } = await context.params;
    const auth = await requireProfessorApi(req, { scope: 'sections:write' });
    await assertTeachesSection(auth.user, sectionId);
    const linkId = new URL(req.url).searchParams.get('linkId');
    if (!linkId) {
      return NextResponse.json({ error: 'linkId is required' }, { status: 400 });
    }
    const removed = await unlinkSection(sectionId, linkId);
    return NextResponse.json({ removed }, { status: removed ? 200 : 404 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
