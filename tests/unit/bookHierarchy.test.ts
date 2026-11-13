import { describe, expect, it } from 'vitest';

import {
  countTopLevelChapters,
  flattenParsedChapters,
  isMetaTocChapter,
  isTeachableTopLevelChapter,
} from '@/lib/books/hierarchy';
import type { ParsedChapter } from '@/lib/books/types';

describe('flattenParsedChapters', () => {
  it('flattens chapter → sub-chapter with parent positions', () => {
    const roots: ParsedChapter[] = [
      {
        title: 'Part A',
        slug: 'part-a',
        markdown: '# Part A\n',
        children: [
          { title: 'Ch 1', slug: 'ch-1', markdown: '# Ch 1\nbody' },
          { title: 'Ch 2', slug: 'ch-2', markdown: '# Ch 2\nbody' },
        ],
      },
      { title: 'Solo', slug: 'solo', markdown: '# Solo\n' },
    ];
    const flat = flattenParsedChapters(roots);
    expect(flat.map((c) => c.title)).toEqual([
      'Part A',
      'Ch 1',
      'Ch 2',
      'Solo',
    ]);
    expect(flat[0]!.parentPosition).toBeNull();
    expect(flat[0]!.level).toBe(0);
    expect(flat[1]!.parentPosition).toBe(0);
    expect(flat[1]!.level).toBe(1);
    expect(flat[2]!.parentPosition).toBe(0);
    expect(flat[3]!.parentPosition).toBeNull();
  });

  it('caps depth above 1 under the nearest level-1 ancestor', () => {
    const roots: ParsedChapter[] = [
      {
        title: 'Root',
        slug: 'root',
        markdown: '# R\n',
        children: [
          {
            title: 'Sub',
            slug: 'sub',
            markdown: '# S\n',
            children: [
              { title: 'Deep', slug: 'deep', markdown: '# D\n' },
            ],
          },
        ],
      },
    ];
    const flat = flattenParsedChapters(roots);
    expect(flat).toHaveLength(3);
    expect(flat[2]!.level).toBe(1);
    expect(flat[2]!.parentPosition).toBe(1);
  });
});

describe('teachable TOC filters', () => {
  const bookTitle = 'Supply Chain Management - An Integrated Approach';

  it('excludes front matter and book-title leaves from teachable roots', () => {
    const chapters = [
      { id: '1', title: 'Cover', parentId: null, level: 0 },
      { id: '2', title: 'Title Page', parentId: null, level: 0 },
      { id: '3', title: 'Copyright', parentId: null, level: 0 },
      { id: '4', title: 'Table of Contents', parentId: null, level: 0 },
      { id: '5', title: bookTitle, parentId: null, level: 0 },
      {
        id: '6',
        title: 'Chapter 1: Introduction to Supply Chain Management',
        parentId: null,
        level: 0,
      },
      {
        id: '7',
        title: '1.1 Introduction',
        parentId: '6',
        level: 1,
      },
    ];

    expect(
      chapters.filter((c) => isTeachableTopLevelChapter(c, bookTitle)).map(
        (c) => c.id,
      ),
    ).toEqual(['6']);
    expect(countTopLevelChapters(chapters, bookTitle)).toBe(1);
    expect(isMetaTocChapter({ title: 'Cover' }, bookTitle)).toBe(true);
    expect(
      isMetaTocChapter(
        { title: 'Chapter 1: Introduction to Supply Chain Management' },
        bookTitle,
      ),
    ).toBe(false);
  });
});
