/**
 * Live faithful-build eval — one quiz item, synthetic materials (no DB).
 */
import { getAiClientForTask, resolveModel } from '@/lib/ai/gateway';
import { temperatureForModel } from '@/lib/ai/modelRouter';
import { defaultCoursePromptContext } from '@/lib/ai/prompts/courseContext';
import { buildFaithfulBuildSystemPrompt } from '@/lib/ai/prompts/authoring';
import { AUTHORING_PROMPT_VERSION } from '@/lib/authoring/constants';
import type { AuthoringBuildCase } from '@/evals/datasets/authoring';

export type AuthoringBuildEvalOutput = {
  body: AuthoringBuildCase['body'];
  sourceMaterialIds: string[];
  expectHasRubric: boolean;
  expectHasCitation: boolean;
  rawOk: boolean;
};

const MATERIALS = `Lead time is the time from placing an order until goods are received.
EOQ (economic order quantity) balances ordering cost against holding cost.
Safety stock is extra inventory held against demand or lead-time uncertainty.`;

export async function runAuthoringBuildEval(
  input: AuthoringBuildCase,
): Promise<AuthoringBuildEvalOutput> {
  // Static fixtures: score the provided body. Live cases use id prefix `live-`.
  if (!input.id.startsWith('live-')) {
    return {
      body: input.body,
      sourceMaterialIds: input.sourceMaterialIds,
      expectHasRubric: input.expectHasRubric,
      expectHasCitation: input.expectHasCitation,
      rawOk: true,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY required for authoring build eval');
  }

  const itemId = '00000000-0000-4000-8000-000000000001';
  const openai = getAiClientForTask('build', { timeout: 90_000 });
  const buildModel = resolveModel('build').model;
  const ctx = defaultCoursePromptContext({ courseTitle: 'Inventory 101' });
  const buildSystem = buildFaithfulBuildSystemPrompt(ctx);
  const userMsg = `Course: Inventory 101
MODE: materials-grounded full bodies (no prior tag).
Build complete bodies for this module only. Return {"items":[...]} with every itemId below copied exactly.
Every QUIZ must include maxAttempts, passingScore, timeLimit, and points on each question.
Include rubrics and sourceCitations grounded in the materials.

Module: Basics
Items:
${JSON.stringify([{ itemId, type: 'QUIZ', title: 'Lead time & EOQ' }])}

Materials:
${MATERIALS}`;

  const buildTemp = temperatureForModel(buildModel, 0.2);
  const completion = await openai.chat.completions.create({
    model: buildModel,
    ...(buildTemp != null ? { temperature: buildTemp } : {}),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${buildSystem}\nPROMPT_VERSION=${AUTHORING_PROMPT_VERSION}`,
      },
      { role: 'user', content: userMsg },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  let body: AuthoringBuildCase['body'] = { questions: [] };
  let rawOk = false;
  try {
    const parsed = JSON.parse(content || '{}') as {
      items?: Array<{ body?: AuthoringBuildCase['body'] }>;
    };
    const first = parsed.items?.[0]?.body;
    if (first) {
      body = first;
      rawOk = true;
    }
  } catch {
    rawOk = false;
  }

  return {
    body,
    sourceMaterialIds: input.sourceMaterialIds.length
      ? input.sourceMaterialIds
      : ['m1'],
    expectHasRubric: true,
    expectHasCitation: true,
    rawOk,
  };
}
