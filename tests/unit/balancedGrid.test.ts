import { describe, expect, it } from 'vitest';

import {
  getBalancedGridClass,
  getBalancedItemClass,
} from '@/lib/balancedGrid';

describe('getBalancedGridClass', () => {
  it('uses a single column for one item', () => {
    expect(getBalancedGridClass(1)).toContain('grid-cols-1');
    expect(getBalancedGridClass(1)).not.toContain('lg:grid-cols-3');
  });

  it('uses two columns for two or four items', () => {
    expect(getBalancedGridClass(2)).toContain('sm:grid-cols-2');
    expect(getBalancedGridClass(4)).toContain('sm:grid-cols-2');
    expect(getBalancedGridClass(4)).not.toContain('lg:grid-cols-3');
  });

  it('uses three columns for three or five+ when not a lone orphan preference', () => {
    expect(getBalancedGridClass(3)).toContain('lg:grid-cols-3');
    expect(getBalancedGridClass(5)).toContain('lg:grid-cols-3');
  });
});

describe('getBalancedItemClass', () => {
  it('does not center or span the last of four in a 2×2', () => {
    expect(getBalancedItemClass(4, 3)).not.toContain('col-start');
    expect(getBalancedItemClass(4, 3)).not.toContain('col-span-3');
  });

  it('spans the lone leftover on a 3-column last row', () => {
    // 7 items → rows of 3,3,1
    expect(getBalancedItemClass(7, 6)).toContain('lg:col-span-3');
    expect(getBalancedItemClass(7, 5)).not.toContain('col-span');
  });

  it('leaves a two-card last row alone (5 items)', () => {
    expect(getBalancedItemClass(5, 4)).not.toContain('col-span-3');
  });
});
