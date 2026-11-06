import { describe, expect, it } from 'vitest';

import {
  parseQuantityLimit,
  selectReleaseTargetIds,
} from '@/lib/authoring/intent';
import type { OutlineDetail } from '@/lib/authoring/outlines';

function quiz(
  id: string,
  title: string,
  published: boolean,
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
    position: 0,
  } as OutlineDetail['modules'][number]['items'][number];
}

describe('authoring intent quantity', () => {
  it('parses first three', () => {
    expect(parseQuantityLimit('release the first three quizzes')).toEqual({
      count: 3,
      fromEnd: false,
    });
  });

  it('does not limit when all is present', () => {
    expect(parseQuantityLimit('release all quizzes')).toBeNull();
  });

  it('selects only the first N published quizzes in course order', () => {
    const detail = {
      modules: [
        {
          items: [
            quiz('1', 'A', true),
            quiz('2', 'B', true),
            quiz('3', 'C', true),
            quiz('4', 'D', true),
          ],
        },
      ],
    } as OutlineDetail;
    expect(
      selectReleaseTargetIds(detail, 'release the first three quizzes'),
    ).toEqual(['1', '2', '3']);
  });
});
