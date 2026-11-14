import { Badge } from '@/components/ui/badge';
import {
  ATTEMPT_GRADEBOOK_STATUS_LABEL,
  gradebookStatusBadgeVariant,
  type AttemptGradebookStatus,
} from '@/lib/professor/attemptGradeStatus';

export function AttemptGradebookStatusBadge({
  status,
}: {
  status: AttemptGradebookStatus;
}) {
  return (
    <Badge variant={gradebookStatusBadgeVariant(status)}>
      {ATTEMPT_GRADEBOOK_STATUS_LABEL[status]}
    </Badge>
  );
}
