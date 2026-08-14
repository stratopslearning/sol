import { beforeEach, describe, expect, it, vi } from 'vitest';

import { missingExamResource } from '@/lib/examContext';

describe('missingExamResource', () => {
  it('reports assignment missing first when both rows are absent', () => {
    expect(missingExamResource(undefined, undefined)).toBe('assignment');
    expect(missingExamResource(null, null)).toBe('assignment');
    expect(missingExamResource(undefined, { id: 'quiz' })).toBe('assignment');
  });

  it('reports quiz missing only after assignment is present', () => {
    expect(missingExamResource({ id: 'asg' }, undefined)).toBe('quiz');
    expect(missingExamResource({ id: 'asg' }, null)).toBe('quiz');
  });

  it('returns null when both rows exist', () => {
    expect(missingExamResource({ id: 'asg' }, { id: 'quiz' })).toBeNull();
  });
});

const dbMocks = vi.hoisted(() => ({
  assignmentFindFirst: vi.fn(),
  quizFindFirst: vi.fn(),
  attemptFindFirst: vi.fn(),
  attemptFindMany: vi.fn(),
  quizSectionsFindMany: vi.fn(),
}));

vi.mock('@/app/db', () => ({
  db: {
    query: {
      assignments: { findFirst: dbMocks.assignmentFindFirst },
      quizzes: { findFirst: dbMocks.quizFindFirst },
      attempts: {
        findFirst: dbMocks.attemptFindFirst,
        findMany: dbMocks.attemptFindMany,
      },
      quizSections: { findMany: dbMocks.quizSectionsFindMany },
    },
  },
}));

describe('loadExamContext two-wave', () => {
  beforeEach(() => {
    dbMocks.assignmentFindFirst.mockReset();
    dbMocks.quizFindFirst.mockReset();
    dbMocks.attemptFindFirst.mockReset();
    dbMocks.attemptFindMany.mockReset();
    dbMocks.quizSectionsFindMany.mockReset();
  });

  it('skips wave 2 when assignment is missing', async () => {
    dbMocks.assignmentFindFirst.mockResolvedValue(undefined);
    dbMocks.quizFindFirst.mockResolvedValue({ id: 'quiz' });

    const { loadExamContext } = await import('@/lib/examContext');
    const ctx = await loadExamContext({
      quizId: 'quiz-1',
      assignmentId: 'asg-1',
      studentId: 'stu-1',
    });

    expect(ctx.assignment).toBeUndefined();
    expect(ctx.quiz).toEqual({ id: 'quiz' });
    expect(ctx.inProgressAttempt).toBeUndefined();
    expect(ctx.submittedCount).toBe(0);
    expect(ctx.quizSectionLinks).toEqual([]);
    expect(dbMocks.attemptFindFirst).not.toHaveBeenCalled();
    expect(dbMocks.attemptFindMany).not.toHaveBeenCalled();
    expect(dbMocks.quizSectionsFindMany).not.toHaveBeenCalled();
  });

  it('skips wave 2 when quiz is missing', async () => {
    dbMocks.assignmentFindFirst.mockResolvedValue({ id: 'asg' });
    dbMocks.quizFindFirst.mockResolvedValue(undefined);

    const { loadExamContext } = await import('@/lib/examContext');
    const ctx = await loadExamContext({
      quizId: 'quiz-1',
      assignmentId: 'asg-1',
      studentId: 'stu-1',
    });

    expect(ctx.assignment).toEqual({ id: 'asg' });
    expect(ctx.quiz).toBeUndefined();
    expect(dbMocks.attemptFindFirst).not.toHaveBeenCalled();
    expect(dbMocks.attemptFindMany).not.toHaveBeenCalled();
    expect(dbMocks.quizSectionsFindMany).not.toHaveBeenCalled();
  });

  it('runs wave 2 when both assignment and quiz exist', async () => {
    dbMocks.assignmentFindFirst.mockResolvedValue({ id: 'asg' });
    dbMocks.quizFindFirst.mockResolvedValue({ id: 'quiz' });
    dbMocks.attemptFindFirst.mockResolvedValue({ id: 'att' });
    dbMocks.attemptFindMany.mockResolvedValue([{ id: 'old' }]);
    dbMocks.quizSectionsFindMany.mockResolvedValue([{ sectionId: 'sec' }]);

    const { loadExamContext } = await import('@/lib/examContext');
    const ctx = await loadExamContext({
      quizId: 'quiz-1',
      assignmentId: 'asg-1',
      studentId: 'stu-1',
    });

    expect(ctx.inProgressAttempt).toEqual({ id: 'att' });
    expect(ctx.submittedCount).toBe(1);
    expect(ctx.quizSectionLinks).toEqual([{ sectionId: 'sec' }]);
    expect(dbMocks.attemptFindFirst).toHaveBeenCalledOnce();
    expect(dbMocks.attemptFindMany).toHaveBeenCalledOnce();
    expect(dbMocks.quizSectionsFindMany).toHaveBeenCalledOnce();
  });
});
