import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { chatbots } from '@/app/db/schema';
import { CHATBOT_MODEL } from '@/lib/chatbot/constants';
import {
  SCM3005_CH1_DESCRIPTION,
  SCM3005_CH1_INSTRUCTIONS,
  SCM3005_CH1_PERSONA,
  SCM3005_CH1_SYSTEM_PROMPT,
  SCM3005_CH1_TITLE,
} from '@/lib/chatbot/prompts/scm3005-ch1';

/**
 * Ensure the SCM3005 Ch1 system template exists. Idempotent.
 * Called from professor discussions surfaces so duplicates are always available.
 * Also refreshes persona/copy when the template already exists.
 */
export async function ensureCh1TemplateChatbot() {
  const existing = await db.query.chatbots.findFirst({
    where: and(eq(chatbots.isTemplate, true), eq(chatbots.title, SCM3005_CH1_TITLE)),
  });

  if (existing) {
    const [updated] = await db
      .update(chatbots)
      .set({
        personaName: SCM3005_CH1_PERSONA,
        instructions: SCM3005_CH1_INSTRUCTIONS,
        systemPrompt: SCM3005_CH1_SYSTEM_PROMPT,
        description: SCM3005_CH1_DESCRIPTION,
        updatedAt: new Date(),
      })
      .where(eq(chatbots.id, existing.id))
      .returning();
    return updated ?? existing;
  }

  const [created] = await db
    .insert(chatbots)
    .values({
      professorId: null,
      title: SCM3005_CH1_TITLE,
      description: SCM3005_CH1_DESCRIPTION,
      personaName: SCM3005_CH1_PERSONA,
      instructions: SCM3005_CH1_INSTRUCTIONS,
      systemPrompt: SCM3005_CH1_SYSTEM_PROMPT,
      relatedQuizId: null,
      isTemplate: true,
      model: CHATBOT_MODEL,
      isActive: true,
    })
    .returning();

  return created;
}
