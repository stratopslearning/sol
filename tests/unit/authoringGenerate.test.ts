import { describe, expect, it } from 'vitest';

import {
  normalizeGeneratedOutlineRaw,
  parseGeneratedOutline,
} from '@/lib/authoring/generate';
import { isFrontMatterChapterTitle } from '@/lib/books/createOutlineFromBook';

function fiveQuestions(opts?: { includeShortAnswer?: boolean }) {
  const includeShortAnswer = opts?.includeShortAnswer ?? true;
  const questions = [
    {
      type: 'MULTIPLE_CHOICE' as const,
      question: 'What organelle makes ATP?',
      options: ['Chloroplast', 'Mitochondrion', 'Nucleus', 'Ribosome'],
      correctAnswer: 'Mitochondrion',
      conceptTags: ['cellular-respiration'],
    },
    {
      type: 'TRUE_FALSE' as const,
      question: 'Water is wet?',
      correctAnswer: 'true',
      conceptTags: ['properties-of-matter'],
    },
    {
      type: 'MULTIPLE_CHOICE' as const,
      question: 'Which molecule carries genetic information?',
      options: ['DNA', 'ATP', 'Glucose', 'Lipid'],
      correctAnswer: 'DNA',
      conceptTags: ['genetics'],
    },
    {
      type: 'TRUE_FALSE' as const,
      question: 'Plants perform photosynthesis.',
      correctAnswer: 'true',
      conceptTags: ['photosynthesis'],
    },
  ];
  if (includeShortAnswer) {
    questions.push({
      type: 'SHORT_ANSWER' as const,
      question: 'Name the energy currency of the cell.',
      correctAnswer: 'ATP',
      conceptTags: ['cellular-respiration'],
    } as unknown as (typeof questions)[number]);
  } else {
    questions.push({
      type: 'TRUE_FALSE' as const,
      question: 'Enzymes are proteins.',
      correctAnswer: 'true',
      conceptTags: ['enzymes'],
    });
  }
  return questions;
}

function fillBlanksInteractive() {
  return {
    type: 'INTERACTIVE' as const,
    title: 'Fill practice',
    interactiveKind: 'FILL_BLANKS' as const,
    interactiveBody: {
      text: 'The cell uses {{ATP}} for energy.',
      blanks: [{ id: 'b1', answers: ['ATP'] }],
    },
  };
}

function discussionItem() {
  return {
    type: 'DISCUSSION' as const,
    title: 'Socratic chat',
    systemPrompt: 'Be Socratic.',
    instructions: 'Guide the student.',
  };
}

function sixChecks() {
  return Array.from({ length: 6 }, (_, i) => ({
    question: `Practice question ${i + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
  }));
}

function chapterLesson() {
  return {
    type: 'LESSON' as const,
    title: 'Interactive chapter',
    chapter: {
      kind: 'interactive_chapter' as const,
      learningObjectives: ['Explain core idea', 'Apply the model'],
      sections: [1, 2, 3, 4].map((n) => ({
        id: `s${n}`,
        title: `Section ${n}`,
        markdown: `Reading for section ${n}.`,
        checkBank: sixChecks(),
      })),
    },
  };
}

function validModuleItems() {
  return [
    chapterLesson(),
    {
      type: 'QUIZ' as const,
      title: 'Check-in',
      questions: fiveQuestions(),
    },
    discussionItem(),
    fillBlanksInteractive(),
  ];
}

describe('parseGeneratedOutline', () => {
  it('accepts lesson chapter then quiz discussion and fill-blanks', () => {
    const data = parseGeneratedOutline({
      title: 'Week 1–2',
      modules: [
        {
          title: 'Foundations',
          summary: 'Core ideas',
          items: validModuleItems(),
        },
      ],
    });
    expect(data.title).toBe('Week 1–2');
    expect(data.modules[0]?.items).toHaveLength(4);
    expect(data.modules[0]?.items.map((i) => i.type)).toEqual([
      'LESSON',
      'QUIZ',
      'DISCUSSION',
      'INTERACTIVE',
    ]);
    expect(data.modules[0]?.items[1]?.questions).toHaveLength(5);
    expect(data.modules[0]?.items[0]?.chapter?.kind).toBe(
      'interactive_chapter',
    );
  });

  it('rejects modules that do not start with a LESSON chapter', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [
              {
                type: 'QUIZ',
                title: 'Q',
                questions: fiveQuestions(),
              },
              discussionItem(),
              fillBlanksInteractive(),
            ],
          },
        ],
      }),
    ).toThrow(/LESSON/i);
  });

  it('rejects modules missing a QUIZ', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [chapterLesson(), discussionItem(), fillBlanksInteractive()],
          },
        ],
      }),
    ).toThrow(/QUIZ/i);
  });

  it('rejects outline missing FILL_BLANKS', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [
              chapterLesson(),
              {
                type: 'QUIZ',
                title: 'Q',
                questions: fiveQuestions(),
              },
              discussionItem(),
              {
                type: 'INTERACTIVE',
                title: 'Accordion only',
                interactiveKind: 'ACCORDION',
                interactiveBody: {
                  panels: [{ id: 'p1', title: 'A', body: 'B' }],
                },
              },
            ],
          },
        ],
      }),
    ).toThrow(/FILL_BLANKS/i);
  });

  it('rejects QUIZ with fewer than 5 questions', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [
              chapterLesson(),
              {
                type: 'QUIZ',
                title: 'Q',
                questions: fiveQuestions().slice(0, 3),
              },
              discussionItem(),
              fillBlanksInteractive(),
            ],
          },
        ],
      }),
    ).toThrow(/at least 5 questions/i);
  });

  it('rejects QUIZ without SHORT_ANSWER', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [
              chapterLesson(),
              {
                type: 'QUIZ',
                title: 'Q',
                questions: fiveQuestions({ includeShortAnswer: false }),
              },
              discussionItem(),
              fillBlanksInteractive(),
            ],
          },
        ],
      }),
    ).toThrow(/SHORT_ANSWER/i);
  });

  it('rejects QUIZ questions without conceptTags', () => {
    const questions = fiveQuestions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (questions[0] as any).conceptTags;
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [
              chapterLesson(),
              { type: 'QUIZ', title: 'Q', questions },
              discussionItem(),
              fillBlanksInteractive(),
            ],
          },
        ],
      }),
    ).toThrow(/conceptTag/i);
  });

  it('rejects FILL_BLANKS without text markers', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [
              chapterLesson(),
              {
                type: 'QUIZ',
                title: 'Q',
                questions: fiveQuestions(),
              },
              discussionItem(),
              {
                type: 'INTERACTIVE',
                title: 'Empty fill',
                interactiveKind: 'FILL_BLANKS',
                interactiveBody: {
                  text: 'No markers here',
                  blanks: [{ id: 'b1', answers: ['x'] }],
                },
              },
            ],
          },
        ],
      }),
    ).toThrow(/\{\{answer\}\}|markers/i);
  });

  it('rejects FILL_BLANKS without blanks', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [
          {
            title: 'M',
            items: [
              chapterLesson(),
              {
                type: 'QUIZ',
                title: 'Q',
                questions: fiveQuestions(),
              },
              discussionItem(),
              {
                type: 'INTERACTIVE',
                title: 'Empty fill',
                interactiveKind: 'FILL_BLANKS',
                interactiveBody: {
                  text: 'Needs {{something}}',
                  blanks: [],
                },
              },
            ],
          },
        ],
      }),
    ).toThrow(/blank/i);
  });

  it('rejects empty modules', () => {
    expect(() =>
      parseGeneratedOutline({ title: 'Bad', modules: [] }),
    ).toThrow();
  });

  it('normalizes common LLM field aliases before parse', () => {
    const data = parseGeneratedOutline({
      Title: 'From aliases',
      modules: [
        {
          name: 'Foundations',
          activities: [
            chapterLesson(),
            {
              type: 'quiz',
              title: 'Check-in',
              questions: fiveQuestions(),
            },
            {
              type: 'discussion',
              title: 'Socratic chat',
              systemPrompt: 'Be Socratic.',
              instructions: 'Guide the student.',
            },
            {
              type: 'interactive',
              title: 'Fill practice',
              interactiveType: 'fill_blanks',
              interactiveBody: {
                text: 'The cell uses {{ATP}} for energy.',
                blanks: [{ id: 'b1', answers: ['ATP'] }],
              },
            },
          ],
        },
      ],
    });
    expect(data.title).toBe('From aliases');
    expect(data.modules[0]?.title).toBe('Foundations');
    expect(data.modules[0]?.items[0]?.type).toBe('LESSON');
    expect(data.modules[0]?.items[1]?.type).toBe('QUIZ');
    expect(data.modules[0]?.items[3]?.interactiveKind).toBe('FILL_BLANKS');
  });

  it('normalizeGeneratedOutlineRaw fills missing titles', () => {
    const normalized = normalizeGeneratedOutlineRaw({
      modules: [{ items: [{ type: 'QUIZ', questions: [] }] }],
    }) as {
      title: string;
      modules: Array<{ title: string; items: Array<{ title: string }> }>;
    };
    expect(normalized.title).toBe('Course outline');
    expect(normalized.modules[0]?.title).toBe('Module 1');
    expect(normalized.modules[0]?.items[0]?.title).toBe('QUIZ 1');
  });

  it('includes path in schema validation errors', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Bad',
        modules: [{ title: 'M', items: [{ title: 'No type' }] }],
      }),
    ).toThrow(/modules\.0\.items\.0\.type/i);
  });

  it('coerces interactiveBody array into ACCORDION panels but still requires FILL_BLANKS', () => {
    expect(() =>
      parseGeneratedOutline({
        title: 'Week 1–2',
        modules: [
          {
            title: 'Foundations',
            items: [
              chapterLesson(),
              {
                type: 'QUIZ',
                title: 'Check-in',
                questions: fiveQuestions(),
              },
              discussionItem(),
              {
                type: 'INTERACTIVE',
                title: 'Concept accordion',
                interactiveKind: 'ACCORDION',
                interactiveBody: [
                  { id: 'p1', title: 'ATP', body: 'Energy currency' },
                  { title: 'NADH', content: 'Electron carrier' },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(/FILL_BLANKS/i);
  });

  it('accepts FILL_BLANKS with matching markers and blanks', () => {
    const data = parseGeneratedOutline({
      title: 'Week 1',
      modules: [
        {
          title: 'Foundations',
          items: [
            chapterLesson(),
            {
              type: 'QUIZ',
              title: 'Check-in',
              questions: fiveQuestions(),
            },
            discussionItem(),
            {
              type: 'INTERACTIVE',
              title: 'Two blanks',
              interactiveKind: 'FILL_BLANKS',
              interactiveBody: {
                text: '{{mitochondria}} make {{ATP}}.',
                blanks: [
                  { id: 'b1', answers: ['mitochondria'] },
                  { id: 'b2', answers: ['ATP'] },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(data.modules[0]?.items[3]?.interactiveBody).toMatchObject({
      text: '{{mitochondria}} make {{ATP}}.',
    });
  });
});

describe('isFrontMatterChapterTitle', () => {
  it('filters common front matter', () => {
    expect(isFrontMatterChapterTitle('Preface')).toBe(true);
    expect(isFrontMatterChapterTitle('Table of Contents')).toBe(true);
    expect(isFrontMatterChapterTitle('About the Author')).toBe(true);
    expect(isFrontMatterChapterTitle('Copyright')).toBe(true);
    expect(isFrontMatterChapterTitle('How to Use This Book')).toBe(true);
    expect(isFrontMatterChapterTitle('Cover')).toBe(true);
    expect(isFrontMatterChapterTitle('Title Page')).toBe(true);
  });

  it('keeps teachable chapters', () => {
    expect(isFrontMatterChapterTitle('Photosynthesis')).toBe(false);
    expect(isFrontMatterChapterTitle('Chapter 3: Cell Division')).toBe(false);
  });
});
