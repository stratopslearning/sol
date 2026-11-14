import { describe, expect, it } from 'vitest';

import { assembleFaithfulItemBodies } from '@/lib/authoring/faithfulBuild';

const quizId = '11111111-1111-4111-8111-111111111111';
const discussionId = '22222222-2222-4222-8222-222222222222';
const interactiveId = '33333333-3333-4333-8333-333333333333';

function questions() {
  return [
    {
      type: 'MULTIPLE_CHOICE',
      question: 'What schedules processes?',
      options: ['Kernel', 'Compiler', 'Linker', 'Shell'],
      correctAnswer: 'Kernel',
      conceptTags: ['scheduling'],
    },
    {
      type: 'TRUE_FALSE',
      question: 'A process has an address space.',
      correctAnswer: true,
      conceptTags: 'processes',
    },
    {
      type: 'MULTIPLE_CHOICE',
      question: 'Which structure holds a thread’s registers?',
      choices: [
        { text: 'PCB' },
        { text: 'TLB' },
        { text: 'Inode' },
        { text: 'Page table' },
      ],
      answer: 'PCB',
      conceptTags: ['threads'],
    },
    {
      type: 'TRUE_FALSE',
      question: 'Context switches are free.',
      correctAnswer: 'false',
      conceptTags: ['scheduling'],
    },
    {
      type: 'SHORT_ANSWER',
      prompt: 'Name the kernel object that represents a running program.',
      correctAnswer: 'process',
      conceptTags: ['processes'],
    },
  ];
}

const expected = [
  { itemId: quizId, type: 'QUIZ' as const, title: 'Quiz 1: Basics' },
  {
    itemId: discussionId,
    type: 'DISCUSSION' as const,
    title: 'Discussion 1: The Role of Operating Systems',
  },
  {
    itemId: interactiveId,
    type: 'INTERACTIVE' as const,
    title: 'Interactive 1: Fill in the Blanks',
    interactiveKind: 'FILL_BLANKS' as const,
  },
];

describe('assembleFaithfulItemBodies', () => {
  it('accepts a module payload and coerces loose question fields', () => {
    const patches = assembleFaithfulItemBodies(expected, {
      items: [
        { itemId: quizId, type: 'QUIZ', title: 'Quiz 1: Basics', questions: questions() },
        {
          itemId: discussionId,
          body: {
            systemPrompt: 'Ask about the kernel.',
            instructions: 'Explain why the OS exists.',
          },
        },
        {
          itemId: interactiveId,
          interactiveKind: 'FILL_BLANKS',
          interactiveBody: [
            { id: 'b1', answers: ['kernel'] },
          ],
          body: {
            text: 'The {{kernel}} manages processes.',
          },
        },
      ],
    });

    expect(patches).toHaveLength(3);
    expect(patches[0]?.body.questions).toHaveLength(5);
    expect(patches[0]?.body.questions?.[1]?.correctAnswer).toBe('true');
    expect(patches[0]?.body.questions?.[2]?.options).toContain('PCB');
    expect(patches[1]?.body.instructions).toMatch(/OS exists/);
    expect(patches[2]?.body.interactiveKind).toBe('FILL_BLANKS');
    expect(patches[2]?.body.interactiveBody).toMatchObject({
      text: 'The {{kernel}} manages processes.',
    });
  });

  it('matches items by order when the model omits ids', () => {
    const patches = assembleFaithfulItemBodies(expected, {
      modules: [
        {
          items: [
            { questions: questions() },
            {
              systemPrompt: 'Be Socratic.',
              instructions: 'Discuss scheduling.',
            },
            {
              interactiveKind: 'FILL_BLANKS',
              interactiveBody: {
                text: 'The {{scheduler}} picks the next process.',
                blanks: [{ id: 'b1', answers: ['scheduler'] }],
              },
            },
          ],
        },
      ],
    });
    expect(patches.map((patch) => patch.itemId)).toEqual([
      quizId,
      discussionId,
      interactiveId,
    ]);
  });

  it('names the assignment when a quiz is too short', () => {
    expect(() =>
      assembleFaithfulItemBodies(expected, {
        items: [
          {
            itemId: quizId,
            questions: questions().slice(0, 3),
          },
          {
            itemId: discussionId,
            systemPrompt: 'Be Socratic.',
            instructions: 'Discuss scheduling.',
          },
          {
            itemId: interactiveId,
            interactiveKind: 'FILL_BLANKS',
            interactiveBody: {
              text: 'The {{kernel}} manages processes.',
              blanks: [{ id: 'b1', answers: ['kernel'] }],
            },
          },
        ],
      }),
    ).toThrow(/Quiz 1: Basics/i);
  });

  it('rejects a response that drops an assignment', () => {
    expect(() =>
      assembleFaithfulItemBodies(expected, {
        items: [{ itemId: quizId, questions: questions() }],
      }),
    ).toThrow(/Missing assignment bodies/i);
  });
});
