import { Inngest } from 'inngest';

/**
 * Shared Inngest app.
 * Without INNGEST_EVENT_KEY, force Dev Server mode so local sends don't 401
 * against Inngest Cloud.
 */
export const inngest = new Inngest({
  id: 'sol',
  name: 'SOL',
  isDev: !process.env.INNGEST_EVENT_KEY,
});
