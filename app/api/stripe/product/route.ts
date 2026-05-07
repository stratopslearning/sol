import { NextResponse } from 'next/server';

import { resolveCheckoutPrice, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const price = await resolveCheckoutPrice();

    const productId =
      typeof price.product === 'string' ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);

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
        formatted_amount:
          price.unit_amount != null
            ? `$${(price.unit_amount / 100).toFixed(2)}`
            : null,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product details' },
      { status: 500 },
    );
  }
}
