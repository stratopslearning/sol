import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import {
  chatbotSections,
  chatbots,
  quizSections,
  quizzes,
  users,
} from '@/app/db/schema';
import { extractRequestMeta, logAudit } from '@/lib/audit';
import type { UserData } from '@/lib/getOrCreateUser';
import { invalidateUserCache, toUserData } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
  role: z.enum(['STUDENT', 'PROFESSOR', 'ADMIN']).optional(),
});

async function requireAdminActor(): Promise<
  { admin: UserData } | { response: NextResponse }
> {
  const { userId: adminClerkId } = await auth();
  if (!adminClerkId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const admin = await db.query.users.findFirst({
    where: eq(users.clerkId, adminClerkId),
  });
  if (!admin || admin.role !== 'ADMIN') {
    return {
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      ),
    };
  }
  return { admin: toUserData(admin) };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetUserId } = await params;
    const gate = await requireAdminActor();
    if ('response' in gate) return gate.response;
    const { admin } = gate;

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 },
      );
    }
    const validatedData = parsed.data;

    const before = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!before) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))
      .returning();

    invalidateUserCache({
      userId: targetUserId,
      clerkId: updatedUser.clerkId,
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: admin.id,
      actorClerkId: admin.clerkId,
      action: 'admin.user.update',
      targetType: 'user',
      targetId: targetUserId,
      metadata: {
        before: { role: before.role },
        after: { role: updatedUser.role },
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * Hard-delete a SOL user and their Clerk account.
 * Owned quizzes/chatbots and assignment attribution are reassigned to the
 * deleting admin so RESTRICT FKs do not block the delete (education records
 * on those quizzes stay intact). Enrollments, attempts, tokens cascade.
 *
 * Order: verify + delete in Clerk first, then remove the Neon row. Never wipe
 * Neon if Clerk delete fails (that left orphaned Clerk accounts before).
 *
 * Query `?allowMissingClerk=1` allows Neon-only cleanup when the Clerk user
 * is already gone (orphan SOL row).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetUserId } = await params;
    const gate = await requireAdminActor();
    if ('response' in gate) return gate.response;
    const { admin } = gate;

    const allowMissingClerk =
      req.nextUrl.searchParams.get('allowMissingClerk') === '1';

    const target = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.id === admin.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 },
      );
    }
    if (!target.clerkId?.startsWith('user_')) {
      return NextResponse.json(
        {
          error:
            'SOL profile has an invalid Clerk id — cannot delete the Clerk account.',
        },
        { status: 400 },
      );
    }

    const clerk = await clerkClient();
    let clerkIdToDelete = target.clerkId;
    let clerkUserExists = false;

    try {
      await clerk.users.getUser(clerkIdToDelete);
      clerkUserExists = true;
    } catch (err) {
      if (clerkErrorStatus(err) !== 404) {
        return NextResponse.json(
          {
            error: `Cannot reach Clerk for this user: ${clerkErrorDetails(err)}. SOL row left intact.`,
            clerkId: clerkIdToDelete,
          },
          { status: 502 },
        );
      }

      // Stale clerk_id: try resolve by email in the current Clerk instance.
      if (target.email) {
        try {
          const list = await clerk.users.getUserList({
            emailAddress: [target.email],
            limit: 5,
          });
          const match = list.data.find((u) =>
            u.emailAddresses?.some(
              (e) =>
                e.emailAddress.toLowerCase() === target.email.toLowerCase(),
            ),
          );
          if (match) {
            clerkIdToDelete = match.id;
            clerkUserExists = true;
          }
        } catch (listErr) {
          console.warn('Clerk getUserList by email failed', listErr);
        }
      }
    }

    if (clerkUserExists) {
      try {
        await clerk.users.deleteUser(clerkIdToDelete);
      } catch (err) {
        console.error('Clerk deleteUser failed', {
          clerkId: clerkIdToDelete,
          status: clerkErrorStatus(err),
          details: clerkErrorDetails(err),
          err,
        });
        return NextResponse.json(
          {
            error: `Failed to delete Clerk user (SOL row left intact): ${clerkErrorDetails(err)}`,
            clerkId: clerkIdToDelete,
          },
          { status: 502 },
        );
      }

      try {
        await clerk.users.getUser(clerkIdToDelete);
        return NextResponse.json(
          {
            error:
              'Clerk user still exists after deleteUser — SOL row left intact. Check Clerk Dashboard / API keys.',
            clerkId: clerkIdToDelete,
          },
          { status: 502 },
        );
      } catch (err) {
        if (clerkErrorStatus(err) !== 404) {
          return NextResponse.json(
            {
              error: `Clerk delete could not be verified: ${clerkErrorDetails(err)}`,
              clerkId: clerkIdToDelete,
            },
            { status: 502 },
          );
        }
      }
    } else if (!allowMissingClerk) {
      const usingDevKeys =
        (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').startsWith(
          'pk_test_',
        ) || (process.env.CLERK_SECRET_KEY || '').startsWith('sk_test_');
      return NextResponse.json(
        {
          error: usingDevKeys
            ? `No Clerk user found for ${target.email || target.clerkId} with Development API keys. This profile was likely created in Production — use Production Clerk keys locally, or delete from the live site. SOL row left intact.`
            : `No Clerk user found for this profile with the current CLERK_SECRET_KEY (wrong instance/key, or already deleted). SOL row left intact. Retry with orphan cleanup if you only need to remove the Neon row.`,
          clerkId: target.clerkId,
          email: target.email,
          allowMissingClerk: true,
          usingDevKeys,
        },
        { status: 409 },
      );
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actorUserId: admin.id,
      actorClerkId: admin.clerkId,
      action: 'admin.user.delete',
      targetType: 'user',
      targetId: targetUserId,
      metadata: {
        email: target.email,
        role: target.role,
        clerkId: target.clerkId,
        clerkIdDeleted: clerkIdToDelete,
        clerkDeleted: clerkUserExists,
        orphanCleanup: !clerkUserExists && allowMissingClerk,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await db
      .update(quizSections)
      .set({ assignedBy: admin.id })
      .where(eq(quizSections.assignedBy, targetUserId));
    await db
      .update(chatbotSections)
      .set({ assignedBy: admin.id })
      .where(eq(chatbotSections.assignedBy, targetUserId));
    await db
      .update(quizzes)
      .set({ professorId: admin.id, updatedAt: new Date() })
      .where(eq(quizzes.professorId, targetUserId));
    await db
      .update(chatbots)
      .set({ professorId: admin.id, updatedAt: new Date() })
      .where(eq(chatbots.professorId, targetUserId));

    await db.delete(users).where(eq(users.id, targetUserId));

    return NextResponse.json({
      success: true,
      clerkDeleted: clerkUserExists,
      orphanCleanup: !clerkUserExists && allowMissingClerk,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

function clerkErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  if ('status' in err && typeof (err as { status?: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  if (
    'statusCode' in err &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (err as { statusCode: number }).statusCode;
  }
  return undefined;
}

function clerkErrorDetails(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return err instanceof Error ? err.message : String(err);
  }
  const errors = (
    err as {
      errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
    }
  ).errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors
      .map((e) => e.longMessage || e.message || e.code || 'unknown')
      .join('; ');
  }
  return err instanceof Error ? err.message : String(err);
}
