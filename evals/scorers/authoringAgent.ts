import type { AuthoringAgentEvalCase } from '@/evals/datasets/authoring-agent';
import type { AuthoringAgentEvalOutput } from '@/evals/tasks/authoringAgent';

export function scoreAuthoringAgentContract(args: {
  input: AuthoringAgentEvalCase;
  output: AuthoringAgentEvalOutput;
}): { name: string; score: number } {
  const { input, output } = args;
  let hits = 0;
  let total = 1;

  if (output.kind === input.expectKind) hits += 1;

  if (input.forbidTools?.length) {
    total += 1;
    const forbidden = input.forbidTools.some((t) =>
      output.toolNames.includes(t),
    );
    if (!forbidden) hits += 1;
  }

  if (input.requireTools?.length) {
    total += 1;
    const required = input.requireTools.every((t) =>
      output.toolNames.includes(t),
    );
    if (required) hits += 1;
  }

  if (input.replyMust) {
    total += 1;
    if (new RegExp(input.replyMust, 'i').test(output.reply)) hits += 1;
  }

  if (input.replyMustNot) {
    total += 1;
    if (!new RegExp(input.replyMustNot, 'i').test(output.reply)) hits += 1;
  }

  return { name: 'authoring_agent_contract', score: hits / total };
}
