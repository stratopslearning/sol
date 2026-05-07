import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { db } from '@/app/db';
import { stripeEvents, users as dbUsers } from '@/app/db/schema';
import { stripe } from '@/lib/stripe';

// Stripe webhooks need the raw request body for signature verification, so
// we MUST run on the Node.js runtime. The Edge runtime would buffer the body
// in a way that breaks the signature check.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    // 5xx so Stripe retries when the deploy gets the env var.
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await req.arrayBuffer();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(rawBody),
      sig,
      webhookSecret,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency: if we've already recorded this event, skip processing. The
  // unique constraint on `event_id` ensures concurrent retries don't both
  // mutate user state. We attempt the insert first; a unique-constraint
  // violation tells us this event was already accepted.
  try {
    await db.insert(stripeEvents).values({
      eventId: event.id,
      type: event.type,
      payload: event as unknown as object,
    });
  } catch (insertErr) {
    // Already-processed event: ack so Stripe stops retrying.
    console.warn('Stripe event already processed (idempotency hit):', event.id);
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    await processStripeEvent(event);
    await db
      .update(stripeEvents)
      .set({ processedAt: new Date() })
      .where(eq(stripeEvents.eventId, event.id));
  } catch (err) {
    console.error('Stripe webhook handler failed:', { eventId: event.id, err });
    // 5xx so Stripe retries with backoff. We do NOT mark the event processed
    // and the next retry will hit the idempotency guard, fail to insert, and
    // be acked — so we must make the handler itself idempotent (it is: we
    // toggle a paid flag, not append).
    //
    // To allow retry to actually re-run the handler, we delete the event row
    // so the next delivery re-inserts and re-runs.
    try {
      await db.delete(stripeEvents).where(eq(stripeEvents.eventId, event.id));
    } catch (cleanupErr) {
      console.error('Failed to clean up stripe_event for retry:', cleanupErr);
    }
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // payment_status guard: a completed session can still be `unpaid` for
      // async-payment flows; we only mark paid on confirmed payment.
      if (session.payment_status !== 'paid') {
        return;
      }
      const clerkUserId =
        session.metadata?.clerkUserId ?? session.client_reference_id ?? null;
      if (!clerkUserId) {
        // No correlation possible — surface as a 5xx so it ends up in alerting.
        throw new Error(
          `checkout.session.completed missing clerkUserId metadata (session ${session.id})`,
        );
      }

      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null;

      const result = await db
        .update(dbUsers)
        .set({
          paid: true,
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        })
        .where(eq(dbUsers.clerkId, clerkUserId))
        .returning({ id: dbUsers.id });

      if (result.length === 0) {
        throw new Error(
          `checkout.session.completed referenced unknown clerkUserId ${clerkUserId} (session ${session.id})`,
        );
      }
      return;
    }

    case 'charge.refunded':
    case 'charge.dispute.created':
    case 'charge.dispute.funds_withdrawn': {
      const charge =
        event.type === 'charge.refunded'
          ? (event.data.object as Stripe.Charge)
          : await resolveChargeFromDispute(event.data.object as Stripe.Dispute);

      const customerId =
        typeof charge.customer === 'string'
          ? charge.customer
          : charge.customer?.id ?? null;

      // Prefer customer mapping, fall back to PaymentIntent metadata which we
      // populated at checkout creation time.
      let clerkUserId: string | null = null;
      if (charge.payment_intent) {
        const piId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent.id;
        try {
          const pi = await stripe.paymentIntents.retrieve(piId);
          clerkUserId = pi.metadata?.clerkUserId ?? null;
        } catch (e) {
          console.warn('Failed to retrieve payment intent for refund/dispute', e);
        }
      }

      if (!clerkUserId && customerId) {
        const customerRow = await db.query.users.findFirst({
          where: eq(dbUsers.stripeCustomerId, customerId),
        });
        clerkUserId = customerRow?.clerkId ?? null;
      }

      if (!clerkUserId) {
        // Unable to map back to a user — log loudly so finance can investigate.
        console.error(
          `${event.type} could not be mapped to a user`,
          { eventId: event.id, customerId },
        );
        return;
      }

      await db
        .update(dbUsers)
        .set({ paid: false, updatedAt: new Date() })
        .where(eq(dbUsers.clerkId, clerkUserId));
      return;
    }

    default:
      // Other event types are accepted (200) but produce no side effects.
      return;
  }
}

async function resolveChargeFromDispute(
  dispute: Stripe.Dispute,
): Promise<Stripe.Charge> {
  const chargeId =
    typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
  return stripe.charges.retrieve(chargeId);
}
