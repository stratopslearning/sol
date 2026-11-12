import { describe, expect, it } from 'vitest';

import { AUTHORING_AGENT_EVAL_DATASET } from '../../evals/datasets/authoring-agent';
import { CHATBOT_EVAL_DATASET } from '../../evals/datasets/chatbot';
import { INSIGHTS_EVAL_DATASET } from '../../evals/datasets/insights';
import { MCP_ROUTING_EVAL_DATASET } from '../../evals/datasets/mcp-routing';
import { RUBRIC_EVAL_DATASET } from '../../evals/datasets/rubric';

/**
 * Lightweight CI guards for Braintrust eval fixtures (no OpenAI calls).
 * Full LLM scoring runs in .github/workflows/evals.yml (npm run eval).
 */
describe('CHATBOT_EVAL_DATASET shape', () => {
  it('is non-empty with required fields', () => {
    expect(CHATBOT_EVAL_DATASET.length).toBeGreaterThan(0);
    for (const row of CHATBOT_EVAL_DATASET) {
      expect(row.id).toBeTruthy();
      expect(row.professorSystemPrompt).toBeTruthy();
      expect(row.userMessage).toBeTruthy();
    }
  });
});

describe('MCP_ROUTING_EVAL_DATASET shape', () => {
  it('is non-empty with required fields', () => {
    expect(MCP_ROUTING_EVAL_DATASET.length).toBeGreaterThan(0);
    for (const row of MCP_ROUTING_EVAL_DATASET) {
      expect(row.id).toBeTruthy();
      expect(row.intent).toBeTruthy();
      expect(row.expectedTool).toBeTruthy();
    }
  });
});

describe('AUTHORING_AGENT_EVAL_DATASET shape', () => {
  it('is non-empty with required fields', () => {
    expect(AUTHORING_AGENT_EVAL_DATASET.length).toBeGreaterThan(0);
    for (const row of AUTHORING_AGENT_EVAL_DATASET) {
      expect(row.id).toBeTruthy();
      expect(row.message).toBeTruthy();
      expect(row.expectKind).toBeTruthy();
    }
  });
});

describe('RUBRIC_EVAL_DATASET shape', () => {
  it('is non-empty with required fields', () => {
    expect(RUBRIC_EVAL_DATASET.length).toBeGreaterThan(0);
    for (const row of RUBRIC_EVAL_DATASET) {
      expect(row.id).toBeTruthy();
      expect(row.question).toBeTruthy();
      expect(row.correctAnswer).toBeTruthy();
      expect(row.minCriteria).toBeGreaterThan(0);
      expect(row.maxCriteria).toBeGreaterThanOrEqual(row.minCriteria);
    }
  });
});

describe('INSIGHTS_EVAL_DATASET shape', () => {
  it('is non-empty with required fields', () => {
    expect(INSIGHTS_EVAL_DATASET.length).toBeGreaterThan(0);
    for (const row of INSIGHTS_EVAL_DATASET) {
      expect(row.id).toBeTruthy();
      expect(row.kMin).toBeGreaterThan(0);
      expect(row.criterionMissRates.length).toBeGreaterThan(0);
      expect(row.expectMinMisconceptions).toBeGreaterThanOrEqual(0);
      expect(row.expectMinSuggestions).toBeGreaterThanOrEqual(0);
    }
  });
});
