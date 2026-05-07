/**
 * Hard delete (purge) of a section. FK CASCADE wipes attempts, quiz_sections,
 * professor_sections, and student_sections automatically.
 *
 * Use only for FERPA right-to-be-forgotten or to reset test fixtures.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { sections, users } from '@/app/db/schema';
import { extractRequestMeta, logAudit } from '@/lib/audit';

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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    const targetSection = await db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });
    if (!targetSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    await db.delete(sections).where(eq(sections.id, sectionId));

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
    return NextResponse.json({ error: 'Failed to purge section' }, { status: 500 });
  }
}
