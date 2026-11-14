/**
 * Braintrust eval runner for SOL LLM/agent surfaces.
 *
 * Run locally:  BRAINTRUST_WRAP=1 npm run eval
 * Requires:      OPENAI_API_KEY; BRAINTRUST_API_KEY optional (noSendLogs when absent)
 *
 * Env: Vercel/CI already inject process.env — do not load `.env.local` there
 * (and never override host env). Locally, `.env` then `.env.local` fill gaps.
 */
import { config as loadEnv } from 'dotenv';

const hosted =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.CI) ||
  process.env.NODE_ENV === 'production';

// Never override vars the host already set (Vercel / CI / shell).
loadEnv({ path: '.env', quiet: true });
if (!hosted) {
  loadEnv({ path: '.env.local', quiet: true });
}

const PROJECT = process.env.BRAINTRUST_PROJECT?.trim() || 'teachwithsol';
const GRADING_BAND_FLOOR = Number(process.env.EVAL_GRADING_BAND_FLOOR ?? '0.8');
const CHATBOT_FLOOR = Number(process.env.EVAL_CHATBOT_FLOOR ?? '0.75');
const MCP_FLOOR = Number(process.env.EVAL_MCP_FLOOR ?? '0.7');
const AUTHORING_FLOOR = Number(process.env.EVAL_AUTHORING_FLOOR ?? '0.7');
const AUTHORING_AGENT_FLOOR = Number(
  process.env.EVAL_AUTHORING_AGENT_FLOOR ?? '0.7',
);
const SWITCH_UP_FLOOR = Number(process.env.EVAL_SWITCH_UP_FLOOR ?? '0.7');
const REVIEWER_FLOOR = Number(process.env.EVAL_REVIEWER_FLOOR ?? '0.7');
const RUBRIC_FLOOR = Number(process.env.EVAL_RUBRIC_FLOOR ?? '0.7');
const INSIGHTS_FLOOR = Number(process.env.EVAL_INSIGHTS_FLOOR ?? '0.7');

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
    AUTHORING_BUILD_EVAL_DATASET,
    REVIEWER_EVAL_DATASET,
    SWITCH_UP_EVAL_DATASET,
  } = await import('./datasets/authoring');
  const { AUTHORING_AGENT_EVAL_DATASET } = await import(
    './datasets/authoring-agent'
  );
  const { RUBRIC_EVAL_DATASET } = await import('./datasets/rubric');
  const { INSIGHTS_EVAL_DATASET } = await import('./datasets/insights');
  const {
    scoreChatbotContains,
    scoreChatbotNoLeak,
    scoreChatbotPromptSafety,
    scoreChatbotSocraticQuestion,
  } = await import('./scorers/chatbot');
  const { scoreGradingBand, scoreInjectionCap } = await import(
    './scorers/grading'
  );
  const {
    scoreAuthoringBuildCitations,
    scoreReviewerFlags,
    scoreSwitchUpKeyCheck,
  } = await import('./scorers/authoring');
  const { scoreAuthoringAgentContract } = await import(
    './scorers/authoringAgent'
  );
  const { scoreMcpDestructiveConfirm, scoreMcpToolMatch } = await import(
    './scorers/mcp'
  );
  const { scoreRubricStructure } = await import('./scorers/rubric');
  const { scoreInsightsSchema } = await import('./scorers/insights');
  const { routeMcpIntent } = await import('./tasks/mcpRouting');
  const { runAuthoringAgentEvalCase } = await import('./tasks/authoringAgent');
  const { runAuthoringBuildEval } = await import('./tasks/authoringBuild');
  const { runSwitchUpEval } = await import('./tasks/switchUp');
  const { runReviewerEval } = await import('./tasks/reviewer');
  const { runRubricEval } = await import('./tasks/rubric');
  const { runInsightsEval } = await import('./tasks/insights');

  const hasBtKey = Boolean(process.env.BRAINTRUST_API_KEY?.trim());
  if (hasBtKey) {
    initLogger({
      projectName: PROJECT,
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
  }

  const evalDefaults = {
    noSendLogs: !hasBtKey,
  };

  const gradingResult = await Eval(PROJECT, {
    ...evalDefaults,
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
    ...evalDefaults,
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
      (args) => scoreChatbotPromptSafety(args),
    ],
    maxConcurrency: 3,
  });

  const mcpResult = await Eval(PROJECT, {
    ...evalDefaults,
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

  const authoringAgentResult = await Eval(PROJECT, {
    ...evalDefaults,
    experimentName: 'authoring-agent-regression',
    data: AUTHORING_AGENT_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) => runAuthoringAgentEvalCase(input),
    scores: [(args) => scoreAuthoringAgentContract(args)],
    maxConcurrency: 4,
  });

  const authoringResult = await Eval(PROJECT, {
    ...evalDefaults,
    experimentName: 'authoring-build-regression',
    data: AUTHORING_BUILD_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) => runAuthoringBuildEval(input),
    scores: [(args) => scoreAuthoringBuildCitations(args)],
    maxConcurrency: 2,
  });

  const switchUpResult = await Eval(PROJECT, {
    ...evalDefaults,
    experimentName: 'switch-up-regression',
    data: SWITCH_UP_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) => runSwitchUpEval(input),
    scores: [(args) => scoreSwitchUpKeyCheck(args)],
    maxConcurrency: 2,
  });

  const reviewerResult = await Eval(PROJECT, {
    ...evalDefaults,
    experimentName: 'authoring-reviewer-regression',
    data: REVIEWER_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) => runReviewerEval(input),
    scores: [(args) => scoreReviewerFlags(args)],
    maxConcurrency: 2,
  });

  const rubricResult = await Eval(PROJECT, {
    ...evalDefaults,
    experimentName: 'rubric-regression',
    data: RUBRIC_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) => runRubricEval(input),
    scores: [(args) => scoreRubricStructure(args)],
    maxConcurrency: 2,
  });

  const insightsResult = await Eval(PROJECT, {
    ...evalDefaults,
    experimentName: 'insights-regression',
    data: INSIGHTS_EVAL_DATASET.map((row) => ({
      input: row,
      metadata: { caseId: row.id },
    })),
    task: async (input) => runInsightsEval(input),
    scores: [(args) => scoreInsightsSchema(args)],
    maxConcurrency: 1,
  });

  const gradingBand = averageScorerScore(gradingResult, 'score_band_match');
  const chatbotLeak = averageScorerScore(chatbotResult, 'no_leak');
  const mcpMatch = averageScorerScore(mcpResult, 'tool_match');
  const authoringAgent = averageScorerScore(
    authoringAgentResult,
    'authoring_agent_contract',
  );
  const authoringTrace = averageScorerScore(
    authoringResult,
    'build_traceability',
  );
  const switchUpScore = averageScorerScore(
    switchUpResult,
    'switch_up_key_check',
  );
  const reviewerScore = averageScorerScore(reviewerResult, 'reviewer_flags');
  const rubricScore = averageScorerScore(rubricResult, 'rubric_structure');
  const insightsScore = averageScorerScore(insightsResult, 'insights_schema');

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
  console.log(
    `authoring agent:          ${(authoringAgent * 100).toFixed(1)}% (floor ${AUTHORING_AGENT_FLOOR * 100}%)`,
  );
  console.log(
    `authoring traceability:   ${(authoringTrace * 100).toFixed(1)}% (floor ${AUTHORING_FLOOR * 100}%)`,
  );
  console.log(
    `switch-up key check:      ${(switchUpScore * 100).toFixed(1)}% (floor ${SWITCH_UP_FLOOR * 100}%)`,
  );
  console.log(
    `reviewer flags:           ${(reviewerScore * 100).toFixed(1)}% (floor ${REVIEWER_FLOOR * 100}%)`,
  );
  console.log(
    `rubric structure:         ${(rubricScore * 100).toFixed(1)}% (floor ${RUBRIC_FLOOR * 100}%)`,
  );
  console.log(
    `insights schema:          ${(insightsScore * 100).toFixed(1)}% (floor ${INSIGHTS_FLOOR * 100}%)`,
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
  if (authoringAgent < AUTHORING_AGENT_FLOOR) {
    failures.push(
      `authoring agent ${authoringAgent} < ${AUTHORING_AGENT_FLOOR}`,
    );
  }
  if (authoringTrace < AUTHORING_FLOOR) {
    failures.push(`authoring traceability ${authoringTrace} < ${AUTHORING_FLOOR}`);
  }
  if (switchUpScore < SWITCH_UP_FLOOR) {
    failures.push(`switch-up ${switchUpScore} < ${SWITCH_UP_FLOOR}`);
  }
  if (reviewerScore < REVIEWER_FLOOR) {
    failures.push(`reviewer ${reviewerScore} < ${REVIEWER_FLOOR}`);
  }
  if (rubricScore < RUBRIC_FLOOR) {
    failures.push(`rubric ${rubricScore} < ${RUBRIC_FLOOR}`);
  }
  if (insightsScore < INSIGHTS_FLOOR) {
    failures.push(`insights ${insightsScore} < ${INSIGHTS_FLOOR}`);
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
