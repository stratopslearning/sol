import { Badge } from '@/components/ui/badge';

type Props = {
  show: boolean;
  /** Student-facing copy on section / course hubs. */
  variant?: 'instructor' | 'student';
};

/** Creator workspaces without verifiedSchool in workspace settings. */
export function CreatorUnverifiedBadge({
  show,
  variant = 'instructor',
}: Props) {
  if (!show) return null;
  if (variant === 'student') {
    return (
      <p className="text-xs text-ink-muted">
        Instructor not verified by a school — this course is not an official
        campus offering.
      </p>
    );
  }
  return (
    <Badge variant="warning" className="font-normal">
      Unverified school
    </Badge>
  );
}
