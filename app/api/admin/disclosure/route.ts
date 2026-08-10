import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { extractRequestMeta, logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  subjectUserId: z.string().uuid().optional(),
  subjectDescription: z.string().min(3).max(500),
  recipient: z.string().min(2).max(200),
  purpose: z.string().min(3).max(500),
  recordsReleased: z.string().min(3).max(1000),
});

/**
 * Record an institution-directed FERPA disclosure (who asked, what released).
 * Writes an append-only audit_log row — no separate mutable table.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await db.query.users.findFirst({
      where: eq(users.clerkId, adminClerkId),
    });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: admin.id,
      actorClerkId: admin.clerkId,
      action: 'ferpa.disclosure.record',
      targetType: 'disclosure',
      targetId: parsed.data.subjectUserId ?? null,
      metadata: parsed.data,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disclosure record failed:', error);
    return NextResponse.json({ error: 'Failed to record disclosure' }, { status: 500 });
  }
}
