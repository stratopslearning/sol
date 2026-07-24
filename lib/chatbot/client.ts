import OpenAI from 'openai';

import { CHATBOT_MODEL } from '@/lib/chatbot/constants';

export const chatbotOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 20_000,
});

export { CHATBOT_MODEL };
