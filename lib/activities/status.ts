import type { ActivityCompletionStatus } from '@/lib/assignments/types';

/** Student-facing completion label for gradebook and assignment lists. */
export function activityCompletionLabel(
  status: ActivityCompletionStatus,
): string {
  switch (status) {
    case 'COMPLETED':
      return 'Done';
    case 'IN_PROGRESS':
      return 'Started';
    case 'NOT_STARTED':
    default:
      return 'Not started';
  }
}

export type CourseActivityKind = 'QUIZ' | 'DISCUSSION' | 'LESSON' | 'INTERACTIVE';

/** Short release / visibility copy for course activity rows. */
export function courseActivityReleaseLabel(opts: {
  kind: CourseActivityKind;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  now?: Date;
}): string {
  const now = opts.now ?? new Date();
  if (!opts.isActive) {
    return opts.kind === 'DISCUSSION' ? 'Discussion draft' : 'Unpublished';
  }
  if (opts.startDate && opts.startDate.getTime() > now.getTime()) {
    return 'Scheduled';
  }
  if (opts.endDate && opts.endDate.getTime() < now.getTime()) {
    return 'Closed';
  }
  switch (opts.kind) {
    case 'QUIZ':
      return 'Open for attempts';
    case 'DISCUSSION':
      return 'Discussion live';
    case 'LESSON':
      return 'Lesson available';
    case 'INTERACTIVE':
      return 'Interactive available';
    default:
      return 'Active';
  }
}
