/** Dedicated light chat model — separate from grading's gpt-5-mini. */
export const CHATBOT_MODEL = 'gpt-4.1-mini';

export const MAX_USER_MESSAGE_CHARS = 2_000;
export const MAX_SESSION_TURNS = 60;
/** Keep at most this many recent user+assistant messages when over the turn cap. */
export const HISTORY_WINDOW_MESSAGES = 40;
/** Soft char budget for safe quiz context injected into the system prompt. */
export const SAFE_QUIZ_CONTEXT_CHAR_BUDGET = 6_000;

export const CHATBOT_TEMPLATE_SLUG = 'scm3005-ch1';
