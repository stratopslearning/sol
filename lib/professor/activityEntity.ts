import type { ActivityType } from '@/lib/assignments/types';

/** Pure helper — safe to import from Client Components. */
export function entityIdForActivity(item: {
  type: ActivityType;
  quizId: string | null;
  chatbotId: string | null;
  interactiveId: string | null;
  lessonId: string | null;
}): string | null {
  switch (item.type) {
    case 'QUIZ':
      return item.quizId;
    case 'DISCUSSION':
      return item.chatbotId;
    case 'INTERACTIVE':
      return item.interactiveId;
    case 'LESSON':
      return item.lessonId;
    default:
      return null;
  }
}
