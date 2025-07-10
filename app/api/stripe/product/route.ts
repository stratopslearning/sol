import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET() {
  try {
    // Fetch the product details
    const product = await stripe.products.retrieve(process.env.STRIPE_PRODUCT_ID!);
    
    // Get the active price for the product
    const prices = await stripe.prices.list({
      product: process.env.STRIPE_PRODUCT_ID!,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      return NextResponse.json({ error: 'No active price found for product' }, { status: 404 });
    }

    const price = prices.data[0];

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
      },
      price: {
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        formatted_amount: `$${(price.unit_amount! / 100).toFixed(2)}`,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product details' }, { status: 500 });
  }
} 