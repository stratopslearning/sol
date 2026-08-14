/**
 * executeQuizSubmit result mapping: pending questions → partial + after() retry.
 * Scoring / OpenAI skip is covered in scoreSubmittedQuestions.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadExamContext: vi.fn(),
  resolveAttemptSectionId: vi.fn(),
  scoreSubmittedQuestions: vi.fn(),
  scheduleAttemptRetry: vi.fn(),
  sectionsFindFirst: vi.fn(),
  questionsFindMany: vi.fn(),
  txAttemptsFindMany: vi.fn(),
  txUpdateReturning: vi.fn(),
  gradeMultipleQuestions: vi.fn(),
  getOrDeriveRubric: vi.fn(),
}));

vi.mock('@/lib/examContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/examContext')>();
  return { ...actual, loadExamContext: mocks.loadExamContext };
});

vi.mock('@/lib/resolveAttemptSection', () => ({
  resolveAttemptSectionId: (...args: unknown[]) =>
    mocks.resolveAttemptSectionId(...args),
}));

vi.mock('@/lib/scoreSubmittedQuestions', () => ({
  scoreSubmittedQuestions: (...args: unknown[]) =>
    mocks.scoreSubmittedQuestions(...args),
}));

vi.mock('@/lib/backgroundRetry', () => ({
  scheduleAttemptRetry: (...args: unknown[]) =>
    mocks.scheduleAttemptRetry(...args),
}));

vi.mock('@/lib/grading', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/grading')>();
  return { ...actual, gradeMultipleQuestions: mocks.gradeMultipleQuestions };
});

vi.mock('@/lib/gradingRubric', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gradingRubric')>();
  return { ...actual, getOrDeriveRubric: mocks.getOrDeriveRubric };
});

vi.mock('@/app/db', () => ({
  db: {
    query: {
      sections: {
        findFirst: (...args: unknown[]) => mocks.sectionsFindFirst(...args),
      },
      questions: {
        findMany: (...args: unknown[]) => mocks.questionsFindMany(...args),
      },
    },
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const whereResult = {
        returning: (...args: unknown[]) => mocks.txUpdateReturning(...args),
        then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
          return Promise.resolve(undefined).then(onFulfilled, onRejected);
        },
      };
      const tx = {
        query: {
          attempts: {
            findMany: (...args: unknown[]) => mocks.txAttemptsFindMany(...args),
          },
        },
        update: () => ({
          set: () => ({
            where: () => whereResult,
          }),
        }),
        insert: () => ({
          values: () => ({
            returning: (...args: unknown[]) => mocks.txUpdateReturning(...args),
          }),
        }),
      };
      return fn(tx);
    },
  },
}));

import { executeQuizSubmit } from '@/lib/executeQuizSubmit';
import { gradeMultipleQuestions } from '@/lib/grading';
import { getOrDeriveRubric } from '@/lib/gradingRubric';

const assignment = {
  id: 'asg-1',
  quizId: 'quiz-1',
  studentId: 'stu-1',
  dueDate: null,
};

const quiz = {
  id: 'quiz-1',
  maxAttempts: 3,
  timeLimit: null,
  passingScore: 60,
  startDate: null,
  endDate: null,
  isActive: true,
};

const inProgress = {
  id: 'att-1',
  assignmentId: 'asg-1',
  studentId: 'stu-1',
  quizId: 'quiz-1',
  sectionId: 'sec-1',
  answers: {},
  startedAt: new Date('2026-06-01T12:00:00.000Z'),
  submittedAt: null,
  score: 0,
};

function savedAttempt(overrides: Record<string, unknown> = {}) {
  return {
    ...inProgress,
    submittedAt: new Date('2026-06-01T12:05:00.000Z'),
    score: 0,
    maxScore: 0,
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();

  mocks.loadExamContext.mockResolvedValue({
    assignment,
    quiz,
    inProgressAttempt: inProgress,
    submittedCount: 0,
    quizSectionLinks: [{ sectionId: 'sec-1' }],
  });
  mocks.resolveAttemptSectionId.mockResolvedValue('sec-1');
  mocks.sectionsFindFirst.mockResolvedValue({ id: 'sec-1', endsAt: null });
  mocks.questionsFindMany.mockResolvedValue([]);
  mocks.txAttemptsFindMany
    .mockResolvedValueOnce([inProgress])
    .mockResolvedValueOnce([savedAttempt()]);
  mocks.txUpdateReturning.mockResolvedValue([savedAttempt()]);
});

describe('executeQuizSubmit', () => {
  it('returns complete and does not schedule retry for MCQ-only (no pending)', async () => {
    mocks.scoreSubmittedQuestions.mockResolvedValue({
      totalScore: 2,
      maxScore: 2,
      gptFeedback: {},
      pendingQuestionIds: [],
    });
    mocks.txAttemptsFindMany.mockReset();
    mocks.txAttemptsFindMany
      .mockResolvedValueOnce([inProgress])
      .mockResolvedValueOnce([savedAttempt({ score: 2, maxScore: 2 })]);
    mocks.txUpdateReturning.mockResolvedValue([
      savedAttempt({ score: 2, maxScore: 2 }),
    ]);

    const result = await executeQuizSubmit({
      quizId: 'quiz-1',
      assignmentId: 'asg-1',
      studentId: 'stu-1',
      answers: { 'q-mcq': 'A' },
      autoSubmitted: false,
    });

    expect(result.gradingStatus).toBe('complete');
    expect(result.pendingQuestionCount).toBe(0);
    expect(mocks.scheduleAttemptRetry).not.toHaveBeenCalled();
    expect(gradeMultipleQuestions).not.toHaveBeenCalled();
    expect(getOrDeriveRubric).not.toHaveBeenCalled();
  });

  it('returns partial and schedules retry when short answers are pending', async () => {
    mocks.scoreSubmittedQuestions.mockResolvedValue({
      totalScore: 0,
      maxScore: 0,
      gptFeedback: {
        'q-sa': { score: null, status: 'pending', feedback: 'queued', confidence: 0, maxPoints: 4 },
      },
      pendingQuestionIds: ['q-sa'],
    });

    const result = await executeQuizSubmit({
      quizId: 'quiz-1',
      assignmentId: 'asg-1',
      studentId: 'stu-1',
      answers: { 'q-sa': 'unique answer' },
      autoSubmitted: false,
    });

    expect(result.gradingStatus).toBe('partial');
    expect(result.pendingQuestionCount).toBe(1);
    expect(mocks.scheduleAttemptRetry).toHaveBeenCalledWith('att-1');
    expect(gradeMultipleQuestions).not.toHaveBeenCalled();
    expect(getOrDeriveRubric).not.toHaveBeenCalled();
  });
});
