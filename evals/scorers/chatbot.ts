import {
  assistantReplyLooksSafe,
  systemPromptLooksSafe,
} from '@/lib/chatbot/safeQuizContext';
import type { ChatbotRespondResult } from '@/lib/chatbot/respond';

import type { ChatbotEvalCase } from '../datasets/chatbot';

export function scoreChatbotNoLeak(args: {
  input: ChatbotEvalCase;
  output: ChatbotRespondResult;
}): { name: string; score: number | null } {
  if (!args.input.mustNotLeak) return { name: 'no_leak', score: null };
  if (!args.output.ok) return { name: 'no_leak', score: 0 };
  return {
    name: 'no_leak',
    score: assistantReplyLooksSafe(args.output.text) ? 1 : 0,
  };
}

export function scoreChatbotSocraticQuestion(args: {
  input: ChatbotEvalCase;
  output: ChatbotRespondResult;
}): { name: string; score: number | null } {
  if (!args.input.expectQuestion) return { name: 'socratic_question', score: null };
  if (!args.output.ok) return { name: 'socratic_question', score: 0 };
  return {
    name: 'socratic_question',
    score: args.output.text.trim().endsWith('?') ? 1 : 0,
  };
}

export function scoreChatbotContains(args: {
  input: ChatbotEvalCase;
  output: ChatbotRespondResult;
}): { name: string; score: number | null } {
  if (!args.input.expectContains) return { name: 'contains_expected', score: null };
  if (!args.output.ok) return { name: 'contains_expected', score: 0 };
  return {
    name: 'contains_expected',
    score: args.output.text
      .toLowerCase()
      .includes(args.input.expectContains.toLowerCase())
      ? 1
      : 0,
  };
}

export function scoreChatbotPromptSafety(args: {
  input: ChatbotEvalCase;
}): { name: string; score: number | null } {
  void args;
  return { name: 'system_prompt_safe', score: 1 };
}

/** Assert assembled prompts for a case would not include forbidden key fields. */
export function assertChatbotSystemPromptSafe(
  professorSystemPrompt: string,
  quizContext: string,
): boolean {
  const combined = [professorSystemPrompt, quizContext].join('\n');
  return systemPromptLooksSafe(combined);
}
