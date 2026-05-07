import Stripe from 'stripe';

// Pin to the SDK's expected API version. Bumping this is a coordinated change
// because Stripe ties response shapes to the version. Mirror the version that
// matches the installed `stripe` package's TypeScript types.
//
// Lazily instantiated via a Proxy: when payments are disabled the Stripe
// routes never run, so we should not require the secret at module-load time
// (which would crash the whole process at boot). The first real access throws
// clearly if the key is missing.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  });
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, _receiver) {
    const real = getStripe() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as Function).bind(real) : value;
  },
});

/**
 * Resolve the current price the application sells. Prefers the explicit
 * STRIPE_PRICE_ID env var (which pins us to a specific price) and falls back
 * to looking up the active price for STRIPE_PRODUCT_ID.
 *
 * Pinning matters: a forgotten price update in Stripe can otherwise change
 * what users get charged on the next checkout silently.
 */
export async function resolveCheckoutPrice(): Promise<Stripe.Price> {
  const pinnedPriceId = process.env.STRIPE_PRICE_ID;
  if (pinnedPriceId) {
    return stripe.prices.retrieve(pinnedPriceId);
  }

  const productId = process.env.STRIPE_PRODUCT_ID;
  if (!productId) {
    throw new Error(
      'Either STRIPE_PRICE_ID or STRIPE_PRODUCT_ID must be configured.',
    );
  }
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 1,
  });
  if (prices.data.length === 0) {
    throw new Error('No active price found for STRIPE_PRODUCT_ID.');
  }
  return prices.data[0];
}

/**
 * Strict accessor for the absolute base URL we redirect Stripe checkout back
 * to. We refuse to fall back to `req.headers.get('origin')` because that's
 * easily spoofable and would let a malicious caller redirect a successful
 * payment to an attacker-controlled domain.
 */
export function getRequiredBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL must be configured.');
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error('NEXT_PUBLIC_BASE_URL must be an absolute URL.');
  }
  return baseUrl.replace(/\/$/, '');
}
