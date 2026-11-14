import { describe, expect, it } from 'vitest';

import { getTier, defaultTierForSku } from '@/lib/workspace/pricing';

/**
 * Entitlement differences by SKU (unit-level pricing/plan contracts).
 * Full Stripe gate is covered when paymentsEnabled + license status checks run in app code.
 */
describe('entitlement.sku', () => {
  it('creator default tier is stripe-oriented creator plan', () => {
    const tier = defaultTierForSku('creator');
    expect(tier.sku).toBe('creator');
    expect(tier.id).toBeTruthy();
  });

  it('department and institution use campus tiers', () => {
    expect(defaultTierForSku('department').sku).toBe('department');
    expect(defaultTierForSku('institution').sku).toBe('institution');
  });

  it('getTier returns matching sku for known ids', () => {
    const dept = defaultTierForSku('department');
    const again = getTier(dept.id);
    expect(again?.sku).toBe('department');
  });
});
