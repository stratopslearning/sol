export type ActivityType = 'QUIZ' | 'LESSON' | 'DISCUSSION' | 'INTERACTIVE';

export type ActivityCompletionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SCORED';

export type ActivityListItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  courseId: string | null;
  courseTitle: string | null;
  professorId: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  position: number;
  /** Entity ids for deep links */
  quizId: string | null;
  lessonId: string | null;
  chatbotId: string | null;
  interactiveId: string | null;
  interactiveKind?: string | null;
  sectionIds: string[];
  sectionNames: string[];
  href: string;
  /** Student-facing progress */
  completionStatus?: ActivityCompletionStatus;
  /** Quiz-only numeric summary for lists */
  bestPercentage?: number | null;
  /** Quiz attempts submitted by the student */
  attemptCount?: number | null;
  /** Quiz max attempts (null = unlimited / unknown) */
  maxAttempts?: number | null;
};
