import { describe, expect, it } from 'vitest';

import {
  quizLibraryActionLabels,
  quizVisibilityApiPath,
  quizVisibilityFields,
  uniqueVisibleLibraryQuizzes,
} from '@/lib/professor/quizLibrary';

describe('quizVisibilityFields', () => {
  const now = new Date('2026-08-25T19:00:00.000Z');

  it('hides a quiz without tombstoning it', () => {
    expect(quizVisibilityFields(false, now)).toEqual({
      isActive: false,
      updatedAt: now,
    });
    expect(quizVisibilityFields(false, now)).not.toHaveProperty('deletedAt');
  });

  it('publishing clears deletedAt so a mistaken archive can be restored', () => {
    expect(quizVisibilityFields(true, now)).toEqual({
      isActive: true,
      deletedAt: null,
      updatedAt: now,
    });
  });
});

describe('uniqueVisibleLibraryQuizzes', () => {
  it('drops archived quizzes so they cannot be "reactivated" from the table', () => {
    const visible = uniqueVisibleLibraryQuizzes([
      { id: 'q1', deletedAt: null, title: 'Open' },
      { id: 'q2', deletedAt: new Date(), title: 'Archived' },
      { id: 'q3', deletedAt: null, title: 'Draft' },
    ]);
    expect(visible.map((q) => q.id)).toEqual(['q1', 'q3']);
  });

  it('dedupes the same quiz assigned to multiple sections', () => {
    const visible = uniqueVisibleLibraryQuizzes([
      { id: 'q1', deletedAt: null },
      { id: 'q1', deletedAt: null },
      null,
    ]);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('q1');
  });
});

describe('quiz library action labels', () => {
  it('explains hide vs publish on hover', () => {
    expect(
      quizLibraryActionLabels({ isActive: true, isOwner: true }).visibility,
    ).toMatch(/hide from students/i);
    expect(
      quizLibraryActionLabels({ isActive: false, isOwner: true }).visibility,
    ).toMatch(/publish so students/i);
  });

  it('labels every icon action for owners', () => {
    const labels = quizLibraryActionLabels({ isActive: true, isOwner: true });
    expect(labels.results).toBe('View results');
    expect(labels.edit).toBe('Edit quiz');
    expect(labels.discussion).toBe('Create a discussion from this quiz');
    expect(labels.duplicate).toBe('Duplicate quiz');
  });

  it('points co-teachers at an editable copy', () => {
    expect(
      quizLibraryActionLabels({ isActive: true, isOwner: false }).edit,
    ).toBe('Edit a copy for your section');
  });
});

describe('quizVisibilityApiPath', () => {
  it('does not post hide/publish to the archive endpoint', () => {
    const path = quizVisibilityApiPath('9725aafa-0473-49e5-b3ca-bbc8553d3563');
    expect(path).toContain('/visibility');
    expect(path).not.toContain('/archive');
  });
});
