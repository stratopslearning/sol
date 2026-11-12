/**
 * Live switch-up propose eval — one MCQ fixture, no DB.
 */
import { getAiClientForTask, resolveModel } from '@/lib/ai/gateway';
import { temperatureForModel } from '@/lib/ai/modelRouter';
import { defaultCoursePromptContext } from '@/lib/ai/prompts/courseContext';
import { buildSwitchUpSystemPrompt } from '@/lib/ai/prompts/authoring';
import { AUTHORING_PROMPT_VERSION } from '@/lib/authoring/constants';
import { itemBodySimilarity } from '@/lib/authoring/switchUp';
import { validateSwitchUpVariant } from '@/lib/authoring/switchUpValidate';
import type { OutlineItemBody } from '@/app/db/schema';
import type { SwitchUpEvalCase } from '@/evals/datasets/authoring';

export type SwitchUpEvalOutput = {
  before: OutlineItemBody;
  after: OutlineItemBody;
  expectOk: boolean;
  keyCheckOk: boolean;
  similarity: number;
};

export async function runSwitchUpEval(
  input: SwitchUpEvalCase,
): Promise<SwitchUpEvalOutput> {
  const before = input.before as OutlineItemBody;

  // Static fixtures: score fixed before/after. Live cases use id prefix `live-`.
  if (!input.id.startsWith('live-')) {
    const after = input.after as OutlineItemBody;
    const similarity = itemBodySimilarity(before, after);
    const check = validateSwitchUpVariant(before, after, similarity);
    return {
      before,
      after,
      expectOk: input.expectOk,
      keyCheckOk: check.ok,
      similarity,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY required for switch-up eval');
  }

  const itemId = '00000000-0000-4000-8000-000000000002';
  const openai = getAiClientForTask('switch_up', { timeout: 90_000 });
  const switchModel = resolveModel('switch_up').model;
  const ctx = defaultCoursePromptContext({ courseTitle: 'Inventory 101' });
  const switchSystem = buildSwitchUpSystemPrompt(ctx);
  const userMsg = `Course: Inventory 101
Switch up these items (same structure/objectives; new wording). Original answer keys must NOT work on the variants:
${JSON.stringify([
  {
    itemId,
    type: 'QUIZ',
    title: 'Capital city',
    body: before,
  },
])}

Materials:
(none)`;

  const switchTemp = temperatureForModel(switchModel, 0.7);
  const completion = await openai.chat.completions.create({
    model: switchModel,
    ...(switchTemp != null ? { temperature: switchTemp } : {}),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${switchSystem}\nPROMPT_VERSION=${AUTHORING_PROMPT_VERSION}`,
      },
      { role: 'user', content: userMsg },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  let after = before;
  try {
    const parsed = JSON.parse(content || '{}') as {
      items?: Array<{ body?: OutlineItemBody }>;
    };
    if (parsed.items?.[0]?.body) {
      after = { ...before, ...parsed.items[0].body };
    }
  } catch {
    /* keep before */
  }

  const similarity = itemBodySimilarity(before, after);
  const check = validateSwitchUpVariant(before, after, similarity);
  return {
    before,
    after,
    expectOk: true,
    keyCheckOk: check.ok,
    similarity,
  };
}
