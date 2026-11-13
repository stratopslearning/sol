import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { sections, users } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { requireProfessorApi } from '@/lib/api/professorAuth';
import { enforceRateLimit } from '@/lib/api/rateLimitGuard';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { authorize, tenantIdForSection } from '@/lib/authz';
import { grantSectionStaff } from '@/lib/authz/staffGrants';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import { activeOnly } from '@/lib/db/filters';
import { createSectionStaffInvite } from '@/lib/authz/staffInvites';
import { sendStaffInviteMail } from '@/lib/email';
import { getRequiredBaseUrl } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(['ta', 'grader']),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sectionId: string }> },
) {
  try {
    const { sectionId } = await context.params;
    const auth = await requireProfessorApi(req, { scope: 'sections:write' });
    const user = auth.user;

    const limited = await enforceRateLimit({
      key: `section-staff:${user.id}`,
      limit: 30,
      windowMs: 60_000,
      prefix: 'rl',
    });
    if (limited) return limited;

    const tenantId = await tenantIdForSection(sectionId);
    if (!tenantId) {
      return NextResponse.json({ error: 'Section tenant not found' }, { status: 404 });
    }

    const allowed = await authorize(user, 'staff.manage', {
      tenantId,
      scopeType: 'section',
      scopeId: sectionId,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: 'You cannot add staff to this section' },
        { status: 403 },
      );
    }

    const section = await db.query.sections.findFirst({
      where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
    });
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const parsed = bodySchema.safeParse(await readJsonBody(req));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const target = await db.query.users.findFirst({
      where: sql`lower(${users.email}) = ${email}`,
    });

    let baseUrl: string | undefined;
    try {
      baseUrl = getRequiredBaseUrl();
    } catch {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
    }

    if (!target) {
      const invite = await createSectionStaffInvite({
        tenantId,
        sectionId,
        email,
        role: parsed.data.role,
        grantedBy: user.id,
        baseUrl,
      });
      const sectionWithCourse = await db.query.sections.findFirst({
        where: eq(sections.id, sectionId),
        with: { course: { columns: { title: true } } },
      });
      const emailResult = await sendStaffInviteMail({
        workspaceId: tenantId,
        to: email,
        sectionName: section.name,
        courseTitle: sectionWithCourse?.course?.title ?? null,
        role: parsed.data.role,
        claimUrl: invite.claimUrl,
        expiresAt: invite.expiresAt,
      });
      const meta = extractRequestMeta(req);
      await logAudit({
        actorUserId: user.id,
        actorClerkId: user.clerkId,
        action: 'education.section.staff_invite',
        targetType: 'section',
        targetId: sectionId,
        metadata: {
          role: parsed.data.role,
          email,
          inviteId: invite.inviteId,
          emailSent: emailResult.ok && !('skipped' in emailResult && emailResult.skipped),
        },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return NextResponse.json({
        success: true,
        invited: true,
        claimUrl: invite.claimUrl,
        expiresAt: invite.expiresAt.toISOString(),
        emailSent: emailResult.ok && !('skipped' in emailResult && emailResult.skipped),
        emailSkipped: Boolean(
          emailResult.ok && 'skipped' in emailResult && emailResult.skipped,
        ),
        emailError: emailResult.ok ? undefined : emailResult.error,
      });
    }

    const grant = await grantSectionStaff({
      tenantId,
      userId: target.id,
      sectionId,
      role: parsed.data.role,
      grantedBy: user.id,
      ensureSeat: true,
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: user.id,
      actorClerkId: user.clerkId,
      action: 'education.section.staff_grant',
      targetType: 'section',
      targetId: sectionId,
      metadata: {
        grantId: grant.grantId,
        role: parsed.data.role,
        email,
        targetUserId: target.id,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      success: true,
      grantId: grant.grantId,
      created: grant.created,
      user: { id: target.id, email: target.email },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
