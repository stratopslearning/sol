import { describe, expect, it } from 'vitest';

import {
  authoringCapabilitiesReply,
  buildOutlineInventory,
  resolveItemSelector,
  formatToolResultsReply,
  fallbackPlan,
  normalizePlan,
} from '@/lib/authoring/agent';
import {
  looksLikeHelpOrCapabilitiesRequest,
  parseQuantityLimit,
} from '@/lib/authoring/intent';
import type { OutlineDetail } from '@/lib/authoring/outlines';

function quiz(
  id: string,
  title: string,
  published: boolean,
  position = 0,
): OutlineDetail['modules'][number]['items'][number] {
  return {
    id,
    moduleId: 'm1',
    type: 'QUIZ',
    title,
    status: published ? 'PUBLISHED' : 'DRAFT',
    body: {},
    sourceMaterialIds: [],
    variantOfItemId: null,
    faithfulBody: null,
    publishedQuizId: published ? `quiz-${id}` : null,
    publishedChatbotId: null,
    publishedLessonId: null,
    publishedInteractiveId: null,
    position,
  } as OutlineDetail['modules'][number]['items'][number];
}

const detail = {
  id: 'outline-1',
  courseId: 'course-1',
  title: 'CSE536',
  status: 'READY',
  brief: null,
  hasPriorCorpus: false,
  bodiesBuilt: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  modules: [
    {
      id: 'm1',
      title: 'Module 1',
      summary: null,
      position: 0,
      items: [
        quiz('1', 'A', true, 0),
        quiz('2', 'B', true, 1),
        quiz('3', 'C', true, 2),
        quiz('4', 'D', true, 3),
        quiz('5', 'E', false, 4),
      ],
    },
  ],
} as OutlineDetail;

describe('authoring agent harness', () => {
  it('resolves first three published quizzes', () => {
    const inventory = buildOutlineInventory(detail);
    const resolved = resolveItemSelector(inventory, {
      scope: 'first',
      count: 3,
      types: ['QUIZ'],
      published: true,
    });
    expect(resolved.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('rejects unknown item ids', () => {
    const inventory = buildOutlineInventory(detail);
    expect(() =>
      resolveItemSelector(inventory, {
        scope: 'ids',
        itemIds: ['00000000-0000-4000-8000-000000000099'],
      }),
    ).toThrow(/Unknown item id/);
  });

  it('does not claim Published N when nothing published', () => {
    const reply = formatToolResultsReply([
      {
        name: 'publish_items',
        ok: true,
        published: [],
        failed: [],
        resolvedIds: [],
      },
    ]);
    expect(reply.toLowerCase()).not.toMatch(/published \d/);
    expect(reply).toMatch(/nothing left to publish/i);
  });

  it('templates release counts from facts', () => {
    const reply = formatToolResultsReply([
      {
        name: 'release_items',
        ok: true,
        released: [
          { id: '1', title: 'A' },
          { id: '2', title: 'B' },
          { id: '3', title: 'C' },
        ],
        failed: [],
        resolvedIds: ['1', '2', '3'],
      },
    ]);
    expect(reply).toMatch(/Released 3/);
    expect(reply).toContain('- A');
  });

  it('fallback plan for first three release uses first/count', () => {
    const inventory = buildOutlineInventory(detail);
    expect(parseQuantityLimit('release the first three quizzes')).toEqual({
      count: 3,
      fromEnd: false,
    });
    const plan = fallbackPlan('release the first three quizzes', inventory);
    expect(plan.tools).toHaveLength(1);
    expect(plan.tools[0]?.name).toBe('release_items');
    if (plan.tools[0]?.name === 'release_items') {
      expect(plan.tools[0].args.selector.scope).toBe('first');
      expect(plan.tools[0].args.selector.count).toBe(3);
    }
  });

  it('detects help prompts without treating status questions as help', () => {
    expect(looksLikeHelpOrCapabilitiesRequest('what things can you do')).toBe(
      true,
    );
    expect(looksLikeHelpOrCapabilitiesRequest('How can you help?')).toBe(true);
    expect(looksLikeHelpOrCapabilitiesRequest('help')).toBe(true);
    expect(
      looksLikeHelpOrCapabilitiesRequest('how many quizzes are published?'),
    ).toBe(false);
    expect(
      looksLikeHelpOrCapabilitiesRequest('what quizzes are unpublished'),
    ).toBe(false);
  });

  it('help prompts never list_outline or dump published drafts', () => {
    const inventory = buildOutlineInventory(detail);
    const plan = fallbackPlan('what things can you do', inventory);
    expect(plan.tools.map((t) => t.name)).toEqual(['answer_question']);

    const normalized = normalizePlan('what things can you do', {
      tools: [
        { name: 'list_outline', args: {} },
        {
          name: 'answer_question',
          args: { question: 'what things can you do' },
        },
      ],
    });
    expect(normalized.tools.map((t) => t.name)).toEqual(['answer_question']);

    const reply = authoringCapabilitiesReply(inventory);
    expect(reply.toLowerCase()).toMatch(/refine|publish|release|schedule/);
    expect(reply).not.toMatch(/Published drafts \(course order\)/i);
    expect(reply).not.toContain('[QUIZ]');
    expect(reply).not.toContain('QUIZ: ');
  });
});
