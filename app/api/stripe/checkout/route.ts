import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { withBasePath } from '@/lib/basePath';
import {
  getRequiredBaseUrl,
  resolveCheckoutPrice,
  stripe,
} from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let baseUrl: string;
  try {
    baseUrl = getRequiredBaseUrl();
  } catch (configError) {
    console.error('Stripe checkout misconfiguration:', configError);
    return NextResponse.json({ error: 'Checkout is not configured.' }, { status: 500 });
  }

  try {
    const price = await resolveCheckoutPrice();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      // Tag the Clerk userId on both the Session and the resulting
      // PaymentIntent so the webhook can correlate the payment back to the
      // application user no matter which event Stripe fires.
      client_reference_id: userId,
      metadata: { clerkUserId: userId },
      payment_intent_data: {
        metadata: { clerkUserId: userId },
      },
      success_url: `${baseUrl}${withBasePath('/dashboard/student')}`,
      cancel_url: `${baseUrl}${withBasePath('/payment')}`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Stripe checkout failed' }, { status: 500 });
  }
}
