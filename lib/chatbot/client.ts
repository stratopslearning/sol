import { getAiClient } from '@/lib/ai/gateway';

import { CHATBOT_MODEL } from '@/lib/chatbot/constants';

export const chatbotOpenAI = getAiClient('chatbot', {
  maxRetries: 2,
  timeout: 20_000,
});

export { CHATBOT_MODEL };
