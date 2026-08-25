/**
 * Braintrust eval runner for SOL LLM/agent surfaces.
 *
 * Run locally:  npm run eval
 * Requires:      OPENAI_API_KEY, BRAINTRUST_API_KEY (optional for noSendLogs)
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });
loadEnv({ path: '.env.braintrust', override: true, quiet: true });

const PROJECT = process.env.BRAINTRUST_PROJECT?.trim() || 'SOL';
const GRADING_BAND_FLOOR = Number(process.env.EVAL_GRADING_BAND_FLOOR ?? '0.8');
const CHATBOT_FLOOR = Number(process.env.EVAL_CHATBOT_FLOOR ?? '0.75');
const MCP_FLOOR = Number(process.env.EVAL_MCP_FLOOR ?? '0.7');

function averageScorerScore(
  result: { results: Array<{ scores?: Record<string, number | null> }> },
  name: string,
): number {
  const values = result.results
    .map((row) => row.scores?.[name])
    .filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

async function runEvals() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY missing — add it to .env before running evals.',
    );
  }

  const { Eval, initLogger } = await import('braintrust');
  const { generateChatbotReply } = await import('@/lib/chatbot/respond');
  const { gradeShortAnswer } = await import('@/lib/grading');
  const { CHATBOT_EVAL_DATASET } = await import('./datasets/chatbot');
  const { GRADING_EVAL_DATASET } = await import('./datasets/grading');
  const { MCP_ROUTING_EVAL_DATASET } = await import('./datasets/mcp-routing');
  const {
    scoreChatbotContains,
    scoreChatbotNoLeak,
    scoreChatbotSocraticQuestion,
  } = await import('./scorers/chatbot');
  const { scoreGradingBand, scoreInjectionCap } = await import(
    './scorers/grading'
  );
  const { scoreMcpDestructiveConfirm, scoreMcpToolMatch } = await import(
    './scorers/mcp'
  );
  const { routeMcpIntent } = await import('./tasks/mcpRouting');

  if (process.env.BRAINTRUST_API_KEY) {
    initLogger({ projectName: PROJECT, apiKey: process.env.BRAINTRUST_API_KEY });
  }

  const gradingResult = await Eval(PROJECT, {
    experimentName: 'grading-regression',
    data: GRADING_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id, injection: row.injection ?? false },
    })),
    task: async (input) =>
      gradeShortAnswer({
        question: input.question,
        studentAnswer: input.studentAnswer,
        correctAnswer: input.correctAnswer,
        maxPoints: input.maxPoints,
        questionType: input.questionType,
        rubric: input.rubric,
      }),
    scores: [
      (args) => scoreGradingBand(args),
      (args) => scoreInjectionCap(args),
    ],
    maxConcurrency: 3,
  });

  const chatbotResult = await Eval(PROJECT, {
    experimentName: 'chatbot-regression',
    data: CHATBOT_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) =>
      generateChatbotReply({
        professorSystemPrompt: input.professorSystemPrompt,
        quiz: input.quiz,
        history: [],
        userMessage: input.userMessage,
      }),
    scores: [
      (args) => scoreChatbotNoLeak(args),
      (args) => scoreChatbotSocraticQuestion(args),
      (args) => scoreChatbotContains(args),
    ],
    maxConcurrency: 3,
  });

  const mcpResult = await Eval(PROJECT, {
    experimentName: 'mcp-routing-regression',
    data: MCP_ROUTING_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) => routeMcpIntent(input.intent),
    scores: [
      (args) => scoreMcpToolMatch(args),
      (args) => scoreMcpDestructiveConfirm(args),
    ],
    maxConcurrency: 2,
  });

  const gradingBand = averageScorerScore(gradingResult, 'score_band_match');
  const chatbotLeak = averageScorerScore(chatbotResult, 'no_leak');
  const mcpMatch = averageScorerScore(mcpResult, 'tool_match');

  console.log('\n--- Eval summary ---');
  console.log(
    `grading score_band_match: ${(gradingBand * 100).toFixed(1)}% (floor ${GRADING_BAND_FLOOR * 100}%)`,
  );
  console.log(
    `chatbot no_leak:          ${(chatbotLeak * 100).toFixed(1)}% (floor ${CHATBOT_FLOOR * 100}%)`,
  );
  console.log(
    `mcp tool_match:           ${(mcpMatch * 100).toFixed(1)}% (floor ${MCP_FLOOR * 100}%)`,
  );

  const failures: string[] = [];
  if (gradingBand < GRADING_BAND_FLOOR) {
    failures.push(
      `grading band agreement ${gradingBand} < ${GRADING_BAND_FLOOR}`,
    );
  }
  if (chatbotLeak < CHATBOT_FLOOR) {
    failures.push(`chatbot leak safety ${chatbotLeak} < ${CHATBOT_FLOOR}`);
  }
  if (mcpMatch < MCP_FLOOR) {
    failures.push(`mcp routing ${mcpMatch} < ${MCP_FLOOR}`);
  }

  if (failures.length > 0) {
    console.error('\nEval thresholds not met:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  }
}

runEvals().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
