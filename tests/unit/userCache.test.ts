import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateReturning: vi.fn(),
  auth: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: <T>(fn: T) => fn };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mocks.auth(),
  clerkClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}));

vi.mock('@/app/db', () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => mocks.findFirst(...args) },
    },
    update: () => ({
      set: () => ({
        where: () => ({
          returning: (...args: unknown[]) => mocks.updateReturning(...args),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [],
        }),
      }),
    }),
  },
}));

import {
  getOrCreateUserByClerkId,
  invalidateUserCache,
  updateUser,
  USER_CACHE_TTL_MS,
} from '@/lib/getOrCreateUser';

const baseRow = {
  id: 'user-1',
  clerkId: 'clerk_1',
  email: 'student@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'STUDENT' as const,
  paid: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  invalidateUserCache();
  mocks.findFirst.mockReset();
  mocks.updateReturning.mockReset();
  mocks.auth.mockReset();
  mocks.findFirst.mockResolvedValue(baseRow);
  mocks.auth.mockResolvedValue({ userId: baseRow.clerkId });
});

afterEach(() => {
  vi.useRealTimers();
  invalidateUserCache();
});

describe('getOrCreateUser isolate cache', () => {
  it('does not query on a second lookup within the TTL', async () => {
    const first = await getOrCreateUserByClerkId(baseRow.clerkId);
    const second = await getOrCreateUserByClerkId(baseRow.clerkId);

    expect(first?.id).toBe(baseRow.id);
    expect(second?.id).toBe(baseRow.id);
    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
  });

  it('refetches after invalidateUserCache', async () => {
    await getOrCreateUserByClerkId(baseRow.clerkId);
    invalidateUserCache({ clerkId: baseRow.clerkId });
    mocks.findFirst.mockResolvedValue({ ...baseRow, paid: true });

    const after = await getOrCreateUserByClerkId(baseRow.clerkId);

    expect(after?.paid).toBe(true);
    expect(mocks.findFirst).toHaveBeenCalledTimes(2);
  });

  it('refetches after the TTL expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));

    await getOrCreateUserByClerkId(baseRow.clerkId);
    vi.advanceTimersByTime(USER_CACHE_TTL_MS + 1);
    mocks.findFirst.mockResolvedValue({ ...baseRow, role: 'PROFESSOR' });

    const after = await getOrCreateUserByClerkId(baseRow.clerkId);

    expect(after?.role).toBe('PROFESSOR');
    expect(mocks.findFirst).toHaveBeenCalledTimes(2);
  });

  it('updateUser invalidates so a later lookup is not stale unpaid/student', async () => {
    const before = await getOrCreateUserByClerkId(baseRow.clerkId);
    expect(before?.paid).toBe(false);

    mocks.updateReturning.mockResolvedValue([
      { ...baseRow, paid: true, updatedAt: new Date() },
    ]);

    const updated = await updateUser({ paid: true });
    expect(updated?.paid).toBe(true);

    mocks.findFirst.mockResolvedValue({ ...baseRow, paid: false });
    const after = await getOrCreateUserByClerkId(baseRow.clerkId);

    expect(after?.paid).toBe(true);
  });
});
