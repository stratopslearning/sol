import { describe, expect, it } from 'vitest';

import {
  defaultTierForSku,
  quoteWorkspace,
  tiersForSku,
} from '@/lib/workspace/pricing';

describe('workspace pricing catalog', () => {
  it('has tiers for every SKU', () => {
    for (const sku of [
      'creator',
      'business',
      'department',
      'institution',
    ] as const) {
      expect(tiersForSku(sku).length).toBeGreaterThan(0);
      expect(defaultTierForSku(sku).sku).toBe(sku);
    }
  });

  it('quotes department standard with seat overage', () => {
    const q = quoteWorkspace({
      sku: 'department',
      tierId: 'department_standard',
      activeLearners: 1_600,
      aiUnits: 10_000,
    });
    expect(q.listPriceUsd).toBe(15_000);
    expect(q.seatOverageUsd).toBe(100 * 10);
    expect(q.estimatedRevenueUsd).toBe(16_000);
    expect(q.withinSeatBand).toBe(false);
    expect(q.withinAiBand).toBe(true);
    expect(q.estimatedAiCogsUsd).toBeGreaterThan(0);
  });

  it('picks smallest fitting creator tier', () => {
    const q = quoteWorkspace({ sku: 'creator', activeLearners: 80 });
    expect(q.tier.id).toBe('creator_growth');
    expect(q.withinSeatBand).toBe(true);
  });
});
