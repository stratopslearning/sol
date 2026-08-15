import type { ChatbotMessage } from '@/app/db/schema';
import { minimizeStudentTextForAi } from '@/lib/ai/minimizeEducationPayload';
import {
  CHATBOT_LEAK_REFUSAL,
  SOCRATIC_LEARNING_RULES,
} from '@/lib/chatbot/baseRules';
import {
  HISTORY_WINDOW_MESSAGES,
  SAFE_QUIZ_CONTEXT_CHAR_BUDGET,
} from '@/lib/chatbot/constants';

export type SafeQuizQuestion = {
  order: number;
  type: string;
  question: string;
  /** MCQ option labels only — never which is correct. */
  options?: string[] | null;
};

export type SafeQuizInput = {
  title: string;
  description?: string | null;
  questions: SafeQuizQuestion[];
};

/**
 * Format quiz teaching context for the system prompt.
 * Never includes correctAnswer, rubrics, or student attempts.
 */
export function buildSafeQuizContext(quiz: SafeQuizInput | null | undefined): string {
  if (!quiz) return '';

  const lines: string[] = [
    'Linked quiz teaching context (LEARNING MODE — stems only, no answer keys):',
    `Quiz title: ${quiz.title}`,
  ];
  if (quiz.description?.trim()) {
    lines.push(`Quiz description: ${quiz.description.trim()}`);
  }
  lines.push('Question stems (use only to coach topics; never reveal answers):');

  const sorted = [...quiz.questions].sort((a, b) => a.order - b.order);
  for (const q of sorted) {
    let block = `${q.order + 1}. [${q.type}] ${q.question}`;
    if (
      q.type === 'MULTIPLE_CHOICE' &&
      Array.isArray(q.options) &&
      q.options.length > 0
    ) {
      block += `\n   Options (labels only): ${q.options.join(' | ')}`;
    }
    const candidate = [...lines, block].join('\n');
    if (candidate.length > SAFE_QUIZ_CONTEXT_CHAR_BUDGET) {
      lines.push(
        '(Additional questions omitted to stay within context budget.)',
      );
      break;
    }
    lines.push(block);
  }

  return lines.join('\n');
}

/** Assemble the full system message. Exported for unit tests. */
export function assembleSystemPrompt(
  professorSystemPrompt: string,
  safeQuizContext: string,
): string {
  const ferpaGuard =
    'FERPA: Do not ask for or repeat student legal names, emails, student IDs, or other directory identifiers. Coach on course concepts only.';
  const parts = [
    SOCRATIC_LEARNING_RULES,
    ferpaGuard,
    professorSystemPrompt.trim(),
  ];
  if (safeQuizContext.trim()) {
    parts.push(safeQuizContext.trim());
  }
  return parts.join('\n\n');
}

/** Truncate oldest user/assistant pairs when over the window. */
export function truncateHistory(
  messages: ChatbotMessage[],
  maxMessages = HISTORY_WINDOW_MESSAGES,
): ChatbotMessage[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(messages.length - maxMessages);
}

/** Wrap untrusted student text so the model treats it as data, not instructions. */
export function wrapStudentMessage(text: string): string {
  const minimized = minimizeStudentTextForAi(text);
  return `<student_message>\n${minimized}\n</student_message>`;
}

export function toOpenAiMessages(
  systemContent: string,
  history: ChatbotMessage[],
  userMessage: string,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    { role: 'system', content: systemContent },
    ...truncateHistory(history).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content:
        m.role === 'user' ? wrapStudentMessage(m.content) : m.content,
    })),
    { role: 'user', content: wrapStudentMessage(userMessage) },
  ];
}

/** Assert assembled system text never contains common key-field names from our schema dumps. */
export function systemPromptLooksSafe(systemContent: string): boolean {
  const forbidden = [
    'correctAnswer',
    'correct_answer',
    '"rubric"',
    'gptFeedback',
    'gpt_feedback',
  ];
  const lower = systemContent.toLowerCase();
  return !forbidden.some((f) => lower.includes(f.toLowerCase()));
}

/**
 * Cheap leak detector for assistant replies. Flags schema field names and
 * common "here is the answer key" phrasing — not a guarantee against all
 * paraphrases, but catches the most dangerous dump patterns.
 */
export function assistantReplyLooksSafe(reply: string): boolean {
  if (!reply) return true;
  const lower = reply.toLowerCase();
  const forbidden = [
    'correctanswer',
    'correct_answer',
    'answer key',
    'answerkey',
    'the correct option is',
    'the right answer is',
    'gptfeedback',
    'gpt_feedback',
  ];
  return !forbidden.some((f) => lower.includes(f));
}

/** Replace a leaky reply with a fixed Socratic refusal. */
export function scrubAssistantReply(reply: string): string {
  if (assistantReplyLooksSafe(reply)) return reply;
  return CHATBOT_LEAK_REFUSAL;
}
