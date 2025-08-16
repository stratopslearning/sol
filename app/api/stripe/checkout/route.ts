import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || '';

  try {
    // Fetch the product to get its details
    const product = await stripe.products.retrieve(process.env.STRIPE_PRODUCT_ID!);
    
    // Get the default price for the product
    const prices = await stripe.prices.list({
      product: process.env.STRIPE_PRODUCT_ID!,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new Error('No active price found for product');
    }

    const price = prices.data[0];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id, // Use the actual price ID from your product
          quantity: 1,
        },
      ],
      metadata: {
        clerkUserId: userId,
      },
      success_url: `${baseUrl}/dashboard/student`,
      cancel_url: `${baseUrl}/payment`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Stripe checkout failed' }, { status: 500 });
  }
} 