export type McpRoutingEvalCase = {
  id: string;
  intent: string;
  expectedTool: string;
  /** Destructive tools must not be invoked with confirm=true in routing eval. */
  destructive?: boolean;
};

export const MCP_ROUTING_EVAL_DATASET: McpRoutingEvalCase[] = [
  {
    id: 'list-sections',
    intent: 'Show me all of my course sections.',
    expectedTool: 'list_sections',
  },
  {
    id: 'list-quizzes',
    intent: 'What quizzes do I have available?',
    expectedTool: 'list_quizzes',
  },
  {
    id: 'whoami',
    intent: 'Who am I logged in as?',
    expectedTool: 'whoami',
  },
  {
    id: 'gradebook',
    intent: 'Pull the gradebook for section abc-123.',
    expectedTool: 'get_gradebook',
  },
  {
    id: 'export-results',
    intent: 'Export quiz results as CSV for quiz xyz-456.',
    expectedTool: 'export_results',
  },
  {
    id: 'create-quiz',
    intent: 'Create a new quiz titled Midterm Review with one short answer question.',
    expectedTool: 'create_quiz',
  },
  {
    id: 'archive-quiz-destructive',
    intent: 'Archive quiz old-quiz-id permanently.',
    expectedTool: 'archive_quiz',
    destructive: true,
  },
  {
    id: 'regrade-attempt',
    intent: 'Regrade attempt attempt-789 because the rubric changed.',
    expectedTool: 'regrade_attempt',
  },
  {
    id: 'list-discussions',
    intent: 'List my discussion bots.',
    expectedTool: 'list_discussions',
  },
  {
    id: 'capabilities',
    intent: 'What tools can this token call?',
    expectedTool: 'list_capabilities',
  },
];
