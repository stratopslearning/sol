/**
 * Wave 4 item 29 — citation behavior. Real tests for footnote building, plus
 * `it.todo` stubs for the end-to-end behaviors that need a seeded vector store.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/db', () => ({ db: {} }));

import { buildCitationFootnotes } from '@/lib/knowledge/retrieve';

const chunk = (over: Record<string, unknown>) =>
  ({
    materialId: 'm1',
    title: 'Chapter 1',
    origin: 'course',
    content: 'x',
    ...over,
  }) as never;

describe('buildCitationFootnotes', () => {
  it('returns empty string for no chunks', () => {
    expect(buildCitationFootnotes([])).toBe('');
  });

  it('dedupes by origin+material and labels origin', () => {
    const out = buildCitationFootnotes([
      chunk({}),
      chunk({ content: 'second chunk of same material' }),
      chunk({ materialId: 'm2', title: 'Library Guide', origin: 'shared' }),
    ]);
    expect(out).toBe(
      'Sources:\n- Chapter 1 (course material)\n- Library Guide (shared library)',
    );
  });

  it('does not collapse same material id across origins', () => {
    const out = buildCitationFootnotes([
      chunk({ origin: 'course' }),
      chunk({ origin: 'shared' }),
    ]);
    expect(out.split('\n')).toHaveLength(3);
  });
});

describe('tutor citations — integration stubs (TODO(29))', () => {
  it.todo('tutor reply cites only materials the student section is linked to');
  it.todo('tutor never cites a material from another tenant');
  it.todo('citation footnotes are omitted when retrieval returns no chunks');
  it.todo('quiz stems are never rendered as citations');
});
