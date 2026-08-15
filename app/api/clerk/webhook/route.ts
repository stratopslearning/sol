/**
 * Clerk auth-event webhook — mirrors session lifecycle into audit_log.
 *
 * Pattern matches Stripe: verify signature → insert-first idempotency →
 * process → mark processed. On handler failure delete the row so retries
 * can re-run.
 *
 * Subscribe in Clerk Dashboard to:
 *   session.created, session.ended, session.revoked, session.removed
 * Endpoint: https://<domain>/learning/api/clerk/webhook
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { verifyWebhook } from '@clerk/nextjs/webhooks';

import { db } from '@/app/db';
import { clerkEvents, users } from '@/app/db/schema';
import { logAudit } from '@/lib/audit';
import {
  mapClerkSessionEvent,
  type ClerkSessionAuditAction,
} from '@/lib/clerkWebhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const signingSecret =
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
    process.env.CLERK_WEBHOOK_SECRET;
  if (!signingSecret) {
    console.error('CLERK_WEBHOOK_SIGNING_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  if (!svixId) {
    return NextResponse.json({ error: 'Missing svix-id' }, { status: 400 });
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(req, { signingSecret });
  } catch (err) {
    console.error('Clerk webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    await db.insert(clerkEvents).values({
      eventId: svixId,
      type: event.type,
      payload: event as unknown as object,
    });
  } catch {
    console.warn('Clerk event already processed (idempotency hit):', svixId);
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    await processClerkEvent(event);
    await db
      .update(clerkEvents)
      .set({ processedAt: new Date() })
      .where(eq(clerkEvents.eventId, svixId));
  } catch (err) {
    console.error('Clerk webhook handler failed:', { eventId: svixId, err });
    try {
      await db.delete(clerkEvents).where(eq(clerkEvents.eventId, svixId));
    } catch (cleanupErr) {
      console.error('Failed to clean up clerk_event for retry:', cleanupErr);
    }
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function processClerkEvent(
  event: Awaited<ReturnType<typeof verifyWebhook>>,
): Promise<void> {
  const mapped = mapClerkSessionEvent(event.type);
  if (!mapped) {
    // Ack other event types without side effects.
    return;
  }

  const data = event.data as {
    id?: string;
    user_id?: string;
  };
  const clerkUserId = data.user_id ?? null;
  const sessionId = data.id ?? null;

  let actorUserId: string | null = null;
  if (clerkUserId) {
    const row = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUserId),
      columns: { id: true },
    });
    actorUserId = row?.id ?? null;
  }

  const attrs = (
    event as {
      event_attributes?: {
        http_request?: { client_ip?: string; user_agent?: string };
      };
    }
  ).event_attributes?.http_request;

  await logAudit({
    actorUserId,
    actorClerkId: clerkUserId,
    action: mapped as ClerkSessionAuditAction,
    targetType: 'session',
    targetId: sessionId,
    metadata: { clerkEventType: event.type },
    ip: attrs?.client_ip ?? null,
    userAgent: attrs?.user_agent ?? null,
  });
}
