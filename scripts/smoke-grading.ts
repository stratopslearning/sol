/**
 * Live grading smoke — calls OpenAI via gradeShortAnswer.
 *   npx tsx scripts/smoke-grading.ts
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY missing');
  }

  const { gradeShortAnswer } = await import('../lib/grading');

  const result = await gradeShortAnswer({
    questionId: crypto.randomUUID(),
    questionType: 'SHORT_ANSWER',
    question: 'What is quality assurance focused on?',
    studentAnswer:
      'Quality assurance is process-oriented and aims to prevent defects.',
    correctAnswer:
      'Quality assurance is process-oriented; it focuses on preventing defects rather than only detecting them after the fact.',
    maxPoints: 5,
  });

  const summary = {
    status: result.status,
    score: 'score' in result ? result.score : null,
    maxPoints: 'maxPoints' in result ? result.maxPoints : null,
    failureReason: 'failureReason' in result ? result.failureReason : null,
    cached: 'cached' in result ? result.cached : null,
    hasFeedback: 'feedback' in result ? Boolean(result.feedback) : false,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (result.status !== 'graded') {
    console.error('Grading smoke did not return graded status');
    process.exit(1);
  }
  console.log('Smoke grading passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
