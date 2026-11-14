/**
 * DB-free authoring agent eval task — intent + plan contracts over a synthetic outline.
 */
import {
  authoringCapabilitiesReply,
  authoringOutOfScopeReply,
  buildOutlineInventory,
  classifyAuthoringIntent,
  fallbackPlan,
  normalizePlan,
} from '@/lib/authoring/agent';
import type { OutlineDetail } from '@/lib/authoring/outlines';
import type { AuthoringAgentEvalCase } from '@/evals/datasets/authoring-agent';

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
      title: 'Memory',
      summary: null,
      position: 0,
      items: [
        quiz('1', 'Virtual Memory and Address Translation', true, 0),
        quiz('2', 'Filesystem Structures and Access Control', true, 1),
        quiz('3', 'CPU Scheduling Strategies', false, 2),
      ],
    },
  ],
} as OutlineDetail;

const inventory = buildOutlineInventory(detail);

export type AuthoringAgentEvalOutput = {
  kind: string;
  toolNames: string[];
  reply: string;
};

export async function runAuthoringAgentEvalCase(
  input: AuthoringAgentEvalCase,
): Promise<AuthoringAgentEvalOutput> {
  const intent = classifyAuthoringIntent(input.message, { inventory });
  const rawPlan = fallbackPlan(input.message, inventory);
  const plan = normalizePlan(input.message, rawPlan);
  const toolNames = plan.tools.map((t) => t.name);

  let reply = '';
  if (intent.kind === 'help') {
    reply = authoringCapabilitiesReply(inventory);
  } else if (intent.kind === 'out_of_scope') {
    reply = authoringOutOfScopeReply(intent.outOfScope ?? 'other');
  } else {
    reply = toolNames.join(',') || intent.kind;
  }

  return { kind: intent.kind, toolNames, reply };
}
