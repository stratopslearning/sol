import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { users, workspaceInvites, workspaces } from '@/app/db/schema';
import { apiErrorResponse } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import { getRequiredBaseUrl } from '@/lib/stripe';
import { createWorkspaceOwnerInvite } from '@/lib/workspace/invites';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email().optional(),
});

async function requireAdminUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });
  if (!user || !user.platformStaff) return null;
  return user;
}

/**
 * Platform Ops: resend / rotate owner claim invite (no support grant required).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (workspace.status === 'churned') {
      return NextResponse.json(
        { error: 'Cannot invite on a churned workspace' },
        { status: 400 },
      );
    }

    let email = parsed.data.email?.trim().toLowerCase();
    if (!email) {
      const pending = await db.query.workspaceInvites.findFirst({
        where: eq(workspaceInvites.workspaceId, workspaceId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
      email = pending?.email?.toLowerCase();
    }
    if (!email) {
      return NextResponse.json(
        { error: 'Owner email required' },
        { status: 400 },
      );
    }

    let baseUrl: string | undefined;
    try {
      baseUrl = getRequiredBaseUrl();
    } catch {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
    }

    const invite = await createWorkspaceOwnerInvite({
      workspaceId,
      email,
      role: 'owner',
      baseUrl,
    });

    const { sendWorkspaceInviteMail } = await import('@/lib/email');
    const emailResult = await sendWorkspaceInviteMail({
      workspaceId,
      to: email,
      workspaceName: workspace.name,
      role: 'owner',
      claimUrl: invite.claimUrl,
      expiresAt: invite.expiresAt,
    });

    await logAudit({
      actorUserId: admin.id,
      actorClerkId: admin.clerkId,
      action: 'workspace.owner_invite_resend',
      targetType: 'workspace',
      targetId: workspaceId,
      platform: true,
      metadata: {
        slug: workspace.slug,
        email,
        emailSent: emailResult.ok && !('skipped' in emailResult && emailResult.skipped),
      },
    });

    return NextResponse.json({
      success: true,
      invite: {
        email,
        claimUrl: invite.claimUrl,
        expiresAt: invite.expiresAt.toISOString(),
      },
      emailSent:
        emailResult.ok && !('skipped' in emailResult && emailResult.skipped),
      emailSkipped: Boolean(
        emailResult.ok && 'skipped' in emailResult && emailResult.skipped,
      ),
      emailError: emailResult.ok ? undefined : emailResult.error,
    });
  } catch (error) {
    console.error('[admin/workspaces owner-invite]', error);
    return apiErrorResponse(error);
  }
}
