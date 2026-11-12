/** Deterministic authoring-agent intent/tool contract cases (no live student data). */

export type AuthoringAgentEvalCase = {
  id: string;
  message: string;
  expectKind:
    | 'act'
    | 'status'
    | 'help'
    | 'advise'
    | 'clarify'
    | 'out_of_scope'
    | 'repeat'
    | 'undo';
  forbidTools?: string[];
  requireTools?: string[];
  replyMustNot?: string;
  replyMust?: string;
};

export const AUTHORING_AGENT_EVAL_DATASET: AuthoringAgentEvalCase[] = [
  {
    id: 'help-capabilities',
    message: 'what things can you do',
    expectKind: 'help',
    forbidTools: ['list_outline', 'refine_items'],
    replyMust: 'publish',
    replyMustNot: '\\[QUIZ\\]',
  },
  {
    id: 'status-published',
    message: 'how many quizzes are published?',
    expectKind: 'status',
    forbidTools: ['refine_items', 'publish_items'],
  },
  {
    id: 'advise-difficulty',
    message: 'is this too hard for undergrads?',
    expectKind: 'advise',
    forbidTools: ['publish_items', 'refine_items'],
  },
  {
    id: 'oos-unpublish',
    message: 'unpublish the virtual memory quiz',
    expectKind: 'out_of_scope',
  },
  {
    id: 'oos-delete',
    message: 'delete the filesystem quiz',
    expectKind: 'out_of_scope',
  },
  {
    id: 'oos-add',
    message: 'add a new quiz about deadlocks',
    expectKind: 'out_of_scope',
  },
  {
    id: 'clarify-ok-go',
    message: 'ok go',
    expectKind: 'clarify',
  },
  {
    id: 'act-refine',
    message: 'make the virtual memory quiz harder',
    expectKind: 'act',
    requireTools: ['refine_items'],
  },
  {
    id: 'undo',
    message: 'undo that',
    expectKind: 'undo',
  },
];
