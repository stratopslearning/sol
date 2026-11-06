import { z } from 'zod';

import type { OutlineItemBody } from '@/app/db/schema';
import { getAiClientForTask, resolveModel } from '@/lib/ai/gateway';
import { temperatureForModel } from '@/lib/ai/modelRouter';
import { loadCoursePromptContext } from '@/lib/ai/prompts/courseContext';
import { ApiError } from '@/lib/api/errors';
import { logAudit } from '@/lib/audit';
import {
  buildOutlineInventory,
  inventoryHumanSummary,
  inventoryPlannerSnapshot,
} from '@/lib/authoring/agent/inventory';
import {
  executeToolCall,
  formatToolResultsReply,
  plannerPlanSchema,
  resolveItemSelector,
  type PlannerPlan,
  type ToolCall,
  type ToolResult,
} from '@/lib/authoring/agent/tools';
import { AUTHORING_PROMPT_VERSION } from '@/lib/authoring/constants';
import { buildAuthoringMaterialsContext } from '@/lib/authoring/context';
import {
  isHollowQuizBody,
  mergeOutlineItemBody,
  restoreQuizContentFromFallback,
} from '@/lib/authoring/bodyMerge';
import {
  looksLikePublishRequest,
  looksLikeReleaseRequest,
  looksLikeRewriteRequest,
  looksLikeScheduleRequest,
  looksLikeSubmitRequest,
  parseQuantityLimit,
} from '@/lib/authoring/intent';
import {
  getOutlineDetail,
  type OutlineDetail,
} from '@/lib/authoring/outlines';
import { buildAuthoringAgentPlannerPrompt } from '@/lib/authoring/prompts';
import { authoringScheduleContext } from '@/lib/authoring/schedule';
import type { UserData } from '@/lib/getOrCreateUser';

type AuthUser = Pick<UserData, 'id' | 'platformStaff' | 'clerkId'>;

export type AuthoringAgentResult = {
  assistantMessage: string;
  outline: OutlineDetail;
  patchedItemIds: string[];
  publishedItemIds?: string[];
  releasedItemIds?: string[];
  publishFailed?: Array<{
    itemId: string;
    title: string | null;
    error: string;
  }>;
};

const contentRefineSchema = z.object({
  assistantMessage: z.string().min(1),
  itemPatches: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        body: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
});

const answerSchema = z.object({
  answer: z.string().min(1),
});

/**
 * Grounded authoring chat: plan tools → execute on server → reply from facts.
 */
export async function runAuthoringAgent(
  user: AuthUser,
  opts: {
    outlineId: string;
    message: string;
    focusItemId?: string;
    materialIds?: string[];
  },
  audit?: { ip?: string | null; userAgent?: string | null },
): Promise<AuthoringAgentResult> {
  const { assertCanManageOutline } = await import('@/lib/authoring/access');
  const outlineRow = await assertCanManageOutline(user, opts.outlineId);
  const message = opts.message.trim();
  if (!message) throw ApiError.badRequest('Message is required');
  if (!outlineRow.tenantId) {
    throw ApiError.badRequest('Outline is missing tenant_id');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw ApiError.badRequest('OpenAI is not configured');
  }

  let detail = await getOutlineDetail(user, opts.outlineId);
  let inventory = buildOutlineInventory(detail, opts.focusItemId);

  const {
    fetchAuthoringMessagesForOutline,
    insertAuthoringMessagesDefiner,
    applyOutlineBuildDefiner,
  } = await import('@/lib/db/entityScopedReads');

  const prior = await fetchAuthoringMessagesForOutline(opts.outlineId, 12);
  const history = prior.slice().reverse();

  const { text: materialsContext } = await buildAuthoringMaterialsContext(
    outlineRow.courseId,
    message,
    { materialIds: opts.materialIds },
  );

  const plan = await planTools({
    message,
    inventory,
    history,
    materialsContext,
    courseId: outlineRow.courseId,
  });

  const results: ToolResult[] = [];
  const patchedItemIds: string[] = [];
  const publishedItemIds: string[] = [];
  const releasedItemIds: string[] = [];
  const publishFailed: NonNullable<AuthoringAgentResult['publishFailed']> = [];

  for (const call of plan.tools) {
    // Refresh inventory after mutating tools so later tools see new state.
    if (
      call.name === 'release_items' ||
      call.name === 'publish_items' ||
      call.name === 'schedule_items' ||
      call.name === 'refine_items'
    ) {
      detail = await getOutlineDetail(user, opts.outlineId);
      inventory = buildOutlineInventory(detail, opts.focusItemId);
    }

    if (call.name === 'refine_items') {
      const refineResult = await runContentRefineTool({
        user,
        outlineId: opts.outlineId,
        detail,
        inventory,
        call,
        message,
        materialsContext,
        history,
        courseId: outlineRow.courseId,
        applyOutlineBuildDefiner,
        hasPriorCorpus: detail.hasPriorCorpus,
      });
      results.push(refineResult.result);
      patchedItemIds.push(...refineResult.patchedItemIds);
      continue;
    }

    if (call.name === 'answer_question') {
      const answer = await runAnswerTool({
        question: call.args.question || message,
        inventory,
        materialsContext,
        courseId: outlineRow.courseId,
      });
      results.push({ name: 'answer_question', ok: true, answer });
      continue;
    }

    let toolCall = call;
    if (call.name === 'schedule_items') {
      toolCall = await enrichScheduleCall(call, message, outlineRow.courseId);
    }

    const executed = await executeToolCall({
      user,
      outlineId: opts.outlineId,
      detail,
      inventory,
      call: toolCall,
      audit,
      materialsContext,
    });
    results.push(executed);

    if (executed.ok && executed.name === 'publish_items') {
      publishedItemIds.push(...executed.published.map((p) => p.id));
      for (const f of executed.failed) {
        publishFailed.push({
          itemId: f.id,
          title: f.title,
          error: f.error,
        });
      }
    }
    if (executed.ok && executed.name === 'release_items') {
      releasedItemIds.push(...executed.released.map((p) => p.id));
    }
    if (executed.ok && executed.name === 'schedule_items') {
      patchedItemIds.push(...executed.patched.map((p) => p.id));
    }
  }

  const assistantMessage = formatToolResultsReply(results);

  await insertAuthoringMessagesDefiner({
    outlineId: opts.outlineId,
    tenantId: outlineRow.tenantId,
    messages: [
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage },
    ],
  });

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'professor.authoring.refine',
    targetType: 'course_outline',
    targetId: opts.outlineId,
    tenantId: outlineRow.tenantId,
    metadata: {
      agentHarness: true,
      tools: plan.tools.map((t) => t.name),
      publishedCount: publishedItemIds.length,
      releasedCount: releasedItemIds.length,
      patchedCount: patchedItemIds.length,
      focusItemId: opts.focusItemId ?? null,
    },
    ip: audit?.ip ?? null,
    userAgent: audit?.userAgent ?? null,
  });

  const updated = await getOutlineDetail(user, opts.outlineId);
  return {
    assistantMessage,
    outline: updated,
    patchedItemIds: [...new Set(patchedItemIds)],
    publishedItemIds:
      publishedItemIds.length > 0 ? [...new Set(publishedItemIds)] : undefined,
    releasedItemIds:
      releasedItemIds.length > 0 ? [...new Set(releasedItemIds)] : undefined,
    publishFailed: publishFailed.length > 0 ? publishFailed : undefined,
  };
}

async function planTools(opts: {
  message: string;
  inventory: ReturnType<typeof buildOutlineInventory>;
  history: Array<{ role: string; content: string }>;
  materialsContext: string;
  courseId: string;
}): Promise<PlannerPlan> {
  const openai = getAiClientForTask('refine', { timeout: 45_000 });
  const model = resolveModel('refine').model;
  const courseCtx = await loadCoursePromptContext(opts.courseId);
  const system = `${buildAuthoringAgentPlannerPrompt(courseCtx)}\nPROMPT_VERSION=${AUTHORING_PROMPT_VERSION}`;

  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Schedule context: ${authoringScheduleContext()}\n\nGrounded inventory (only these ids exist):\n${inventoryPlannerSnapshot(opts.inventory)}\n\nMaterials:\n${opts.materialsContext || '(none)'}`,
    },
    ...opts.history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: opts.message },
  ];

  try {
    const temp = temperatureForModel(model, 0.1);
    const completion = await openai.chat.completions.create({
      model,
      ...(temp != null ? { temperature: temp } : {}),
      response_format: { type: 'json_object' },
      messages,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('empty plan');
    const raw = JSON.parse(content) as unknown;
    const parsed = plannerPlanSchema.safeParse(raw);
    if (!parsed.success) throw new Error(parsed.error.message);
    return parsed.data;
  } catch (err) {
    console.error('[authoring agent] plan failed; falling back', err);
    return fallbackPlan(opts.message, opts.inventory);
  }
}

/** Deterministic fallback when the planner JSON is invalid. */
export function fallbackPlan(
  message: string,
  inventory: ReturnType<typeof buildOutlineInventory>,
): PlannerPlan {
  const m = message.toLowerCase();
  const quantity = parseQuantityLimit(message);
  const scope =
    quantity == null
      ? ('all' as const)
      : quantity.fromEnd
        ? ('last' as const)
        : ('first' as const);
  const count = quantity?.count;
  const types = /\bquiz/.test(m)
    ? (['QUIZ'] as const)
    : /\bdiscussion/.test(m)
      ? (['DISCUSSION'] as const)
      : undefined;

  let wantsPublish = looksLikePublishRequest(message);
  let wantsRelease = looksLikeReleaseRequest(message);
  if (looksLikeSubmitRequest(message) && !wantsRelease) {
    const unpublished = inventory.items.filter((i) => !i.published);
    const typed = types
      ? unpublished.filter((i) => (types as readonly string[]).includes(i.type))
      : unpublished;
    if (typed.length === 0) {
      wantsPublish = false;
      wantsRelease = true;
    }
  }

  if ((wantsPublish || wantsRelease) && !looksLikeRewriteRequest(message)) {
    const tools: ToolCall[] = [];
    if (wantsPublish) {
      tools.push({
        name: 'publish_items',
        args: {
          selector: {
            scope,
            count,
            types: types ? [...types] : ['QUIZ'],
            published: false,
          },
        },
      });
    }
    if (wantsRelease) {
      tools.push({
        name: 'release_items',
        args: {
          selector: {
            scope,
            count,
            types: types ? [...types] : ['QUIZ'],
            published: true,
          },
        },
      });
    }
    return { tools };
  }

  if (looksLikeScheduleRequest(message) && !looksLikeRewriteRequest(message)) {
    return {
      tools: [
        {
          name: 'schedule_items',
          args: {
            selector: {
              scope: inventory.focus ? 'focus' : scope,
              count,
              types: types ? [...types] : undefined,
            },
            schedule: {},
          },
        },
      ],
    };
  }

  if (looksLikeRewriteRequest(message)) {
    return {
      tools: [
        {
          name: 'refine_items',
          args: {
            selector: {
              scope: inventory.focus && !quantity ? 'focus' : scope,
              count,
              types: types ? [...types] : undefined,
            },
            instruction: message,
          },
        },
      ],
    };
  }

  if (
    /\?$/.test(message.trim()) ||
    /^(what|which|how many|list|show|status)\b/i.test(message.trim())
  ) {
    return {
      tools: [
        { name: 'list_outline', args: {} },
        {
          name: 'answer_question',
          args: { question: message },
        },
      ],
    };
  }

  return {
    tools: [
      {
        name: 'refine_items',
        args: {
          selector: {
            scope: inventory.focus ? 'focus' : 'all',
            types: types ? [...types] : undefined,
          },
          instruction: message,
        },
      },
    ],
  };
}

async function runContentRefineTool(opts: {
  user: AuthUser;
  outlineId: string;
  detail: OutlineDetail;
  inventory: ReturnType<typeof buildOutlineInventory>;
  call: Extract<ToolCall, { name: 'refine_items' }>;
  message: string;
  materialsContext: string;
  history: Array<{ role: string; content: string }>;
  courseId: string;
  applyOutlineBuildDefiner: (payload: {
    outlineId: string;
    patches: Array<{ itemId: string; title?: string; body: OutlineItemBody }>;
    hasPriorCorpus: boolean;
  }) => Promise<unknown>;
  hasPriorCorpus: boolean;
}): Promise<{ result: ToolResult; patchedItemIds: string[] }> {
  const resolved = resolveItemSelector(
    opts.inventory,
    opts.call.args.selector,
  );
  if (resolved.length === 0) {
    return {
      result: {
        name: 'refine_items',
        ok: true,
        patched: [],
        resolvedIds: [],
      },
      patchedItemIds: [],
    };
  }

  const targetIds = new Set(resolved.map((r) => r.id));
  const slim = opts.detail.modules.map((m) => ({
    id: m.id,
    title: m.title,
    items: m.items
      .filter((i) => targetIds.has(i.id))
      .map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        status: i.status,
        body: i.body,
      })),
  }));

  const { buildRefineSystemPrompt } = await import('@/lib/authoring/prompts');
  const courseCtx = await loadCoursePromptContext(opts.courseId);
  const openai = getAiClientForTask('refine', { timeout: 60_000 });
  const model = resolveModel('refine').model;
  const system = `${buildRefineSystemPrompt(courseCtx)}\nPROMPT_VERSION=${AUTHORING_PROMPT_VERSION}\nOnly patch the provided target items. Do not claim publish/release.`;

  let parsed: z.infer<typeof contentRefineSchema>;
  try {
    const temp = temperatureForModel(model, 0.3);
    const completion = await openai.chat.completions.create({
      model,
      ...(temp != null ? { temperature: temp } : {}),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Schedule context: ${authoringScheduleContext()}\n\nTarget items JSON:\n${JSON.stringify(slim)}\n\nMaterials:\n${opts.materialsContext || '(none)'}\n\nInstruction: ${opts.call.args.instruction}`,
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('empty refine');
    const result = contentRefineSchema.safeParse(JSON.parse(content));
    if (!result.success) throw new Error(result.error.message);
    parsed = result.data;
  } catch (err) {
    console.error('[authoring agent] refine_items failed', err);
    return {
      result: {
        name: 'refine_items',
        ok: false,
        error: 'Failed to refine content',
      },
      patchedItemIds: [],
    };
  }

  const patches: Array<{
    itemId: string;
    title?: string;
    body: OutlineItemBody;
  }> = [];
  const patched: Array<{ id: string; title: string }> = [];

  for (const patch of parsed.itemPatches) {
    if (!targetIds.has(patch.itemId)) continue;
    const existing = opts.detail.modules
      .flatMap((m) => m.items)
      .find((i) => i.id === patch.itemId);
    if (!existing) continue;
    const rawPatch = (patch.body ?? {}) as OutlineItemBody;
    let nextBody = mergeOutlineItemBody(existing.body ?? {}, rawPatch);
    if (
      existing.type === 'QUIZ' &&
      !isHollowQuizBody(existing.body) &&
      isHollowQuizBody(nextBody)
    ) {
      nextBody = restoreQuizContentFromFallback(nextBody, existing.body);
    }
    if (
      existing.type === 'QUIZ' &&
      isHollowQuizBody(nextBody) &&
      existing.faithfulBody &&
      !isHollowQuizBody(existing.faithfulBody)
    ) {
      nextBody = restoreQuizContentFromFallback(
        nextBody,
        existing.faithfulBody,
      );
    }
    patches.push({
      itemId: patch.itemId,
      ...(patch.title ? { title: patch.title.trim() } : {}),
      body: nextBody,
    });
    patched.push({ id: existing.id, title: patch.title ?? existing.title });
  }

  if (patches.length > 0) {
    const { createAuthoringRevision } = await import(
      '@/lib/authoring/revisions'
    );
    await createAuthoringRevision(
      opts.user,
      opts.outlineId,
      `Before refine: ${opts.message.slice(0, 80)}`,
    );
    await opts.applyOutlineBuildDefiner({
      outlineId: opts.outlineId,
      patches,
      hasPriorCorpus: opts.hasPriorCorpus,
    });
  }

  return {
    result: {
      name: 'refine_items',
      ok: true,
      patched,
      resolvedIds: resolved.map((r) => r.id),
      assistantNote: parsed.assistantMessage,
    },
    patchedItemIds: patched.map((p) => p.id),
  };
}

async function enrichScheduleCall(
  call: Extract<ToolCall, { name: 'schedule_items' }>,
  message: string,
  courseId: string,
): Promise<Extract<ToolCall, { name: 'schedule_items' }>> {
  const schedule = call.args.schedule ?? {};
  const hasAny =
    schedule.maxAttempts != null ||
    schedule.timeLimit !== undefined ||
    schedule.passingScore != null ||
    Boolean(schedule.startDate) ||
    Boolean(schedule.endDate);
  if (hasAny) return call;

  const openai = getAiClientForTask('refine', { timeout: 20_000 });
  const model = resolveModel('refine').model;
  try {
    const temp = temperatureForModel(model, 0.1);
    const completion = await openai.chat.completions.create({
      model,
      ...(temp != null ? { temperature: temp } : {}),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Extract quiz schedule fields from the professor request. Return JSON only: { "maxAttempts"?: number, "timeLimit"?: number|null, "passingScore"?: number, "startDate"?: ISO-8601, "endDate"?: ISO-8601 }. Anchor to today: ${authoringScheduleContext()}. Course id context: ${courseId}.`,
        },
        { role: 'user', content: message },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return call;
    const parsed = z
      .object({
        maxAttempts: z.number().int().min(1).max(20).optional(),
        timeLimit: z.number().int().min(1).max(600).nullable().optional(),
        passingScore: z.number().int().min(0).max(100).optional(),
        startDate: z.string().min(1).optional(),
        endDate: z.string().min(1).optional(),
      })
      .safeParse(JSON.parse(content));
    if (!parsed.success) return call;
    return {
      name: 'schedule_items',
      args: {
        selector: call.args.selector,
        schedule: parsed.data,
      },
    };
  } catch {
    return call;
  }
}

async function runAnswerTool(opts: {
  question: string;
  inventory: ReturnType<typeof buildOutlineInventory>;
  materialsContext: string;
  courseId: string;
}): Promise<string> {
  const openai = getAiClientForTask('refine', { timeout: 30_000 });
  const model = resolveModel('refine').model;
  const courseCtx = await loadCoursePromptContext(opts.courseId);
  try {
    const temp = temperatureForModel(model, 0.2);
    const completion = await openai.chat.completions.create({
      model,
      ...(temp != null ? { temperature: temp } : {}),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You answer professor questions about their SOL course outline. Use ONLY the inventory facts. Do not invent publish/release. Return JSON { "answer": string }. Course: ${courseCtx.courseTitle ?? 'course'}.`,
        },
        {
          role: 'user',
          content: `Inventory:\n${inventoryHumanSummary(opts.inventory)}\n\nMaterials:\n${opts.materialsContext || '(none)'}\n\nQuestion: ${opts.question}`,
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return inventoryHumanSummary(opts.inventory);
    const parsed = answerSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return inventoryHumanSummary(opts.inventory);
    return parsed.data.answer;
  } catch {
    return inventoryHumanSummary(opts.inventory);
  }
}
