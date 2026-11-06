import { describe, expect, it } from 'vitest';

import { chunkText } from '@/lib/knowledge/chunk';
import { buildSafeMaterialsContext } from '@/lib/knowledge/retrieve';

describe('chunkText', () => {
  it('returns empty for blank input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    const chunks = chunkText('Hello course materials.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toContain('Hello');
    expect(chunks[0]?.index).toBe(0);
  });

  it('splits long text with overlap', () => {
    const text = Array.from({ length: 80 }, (_, i) => `Paragraph ${i}.`).join(
      '\n\n',
    );
    const chunks = chunkText(text, { targetChars: 120, overlapChars: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.index)).toEqual(
      chunks.map((_, i) => i),
    );
  });
});

describe('buildSafeMaterialsContext', () => {
  it('returns empty when no chunks', () => {
    expect(buildSafeMaterialsContext([])).toBe('');
  });

  it('includes LEARNING MODE header and respects budget', () => {
    const ctx = buildSafeMaterialsContext(
      [
        {
          id: '1',
          materialId: 'm1',
          title: 'Intro',
          origin: 'course' as const,
          content: 'Supply chain risk is the exposure to disruption.',
          distance: 0.1,
        },
      ],
      500,
    );
    expect(ctx).toContain('LEARNING MODE');
    expect(ctx).toContain('Supply chain risk');
  });
});
