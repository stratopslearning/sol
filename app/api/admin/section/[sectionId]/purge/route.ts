/**
 * Hard delete (purge) of a section. FK CASCADE wipes attempts, quiz_sections,
 * professor_sections, and student_sections automatically.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { requireSupportGrant } from '@/lib/authz/requireSupportGrant';
import {
  adminFetchSectionDefiner,
  adminPurgeSectionDefiner,
} from '@/lib/db/tenantWriteDefiners';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  try {
    const { sectionId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!user || !user.platformStaff) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    const targetSection = await adminFetchSectionDefiner(sectionId);
    if (!targetSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    const tenantId =
      (targetSection.tenant_id as string | null) ??
      (targetSection.workspace_id as string | null);
    if (!tenantId) {
      return NextResponse.json({ error: 'Section missing tenant' }, { status: 400 });
    }
    await requireSupportGrant(
      {
        id: user.id,
        clerkId: user.clerkId,
        platformStaff: user.platformStaff,
      },
      tenantId,
      { action: 'support.tenant_access', targetType: 'section', targetId: sectionId },
    );

    await adminPurgeSectionDefiner(sectionId);

    const meta = extractRequestMeta(request);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'admin.section.purge',
      targetType: 'section',
      targetId: sectionId,
      metadata: { name: targetSection.name, hard: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error purging section:', error);
    return apiErrorResponse(error);
  }
}
