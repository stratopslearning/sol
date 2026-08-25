import { createOpenAIClient } from '@/lib/ai/openai';

import { CHATBOT_MODEL } from '@/lib/chatbot/constants';

export const chatbotOpenAI = createOpenAIClient({
  maxRetries: 2,
  timeout: 20_000,
});

export { CHATBOT_MODEL };
