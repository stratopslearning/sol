import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

const LICENSE_STATUS: Record<string, BadgeVariant> = {
  active: 'success',
  trialing: 'warning',
  past_due: 'destructive',
  canceled: 'secondary',
};

const WORKSPACE_STATUS: Record<string, BadgeVariant> = {
  active: 'success',
  trial: 'warning',
  suspended: 'destructive',
  churned: 'secondary',
};

const CLAIM_STATUS: Record<string, BadgeVariant> = {
  claimed: 'success',
  pending: 'warning',
  expired: 'destructive',
  none: 'outline',
};

const COURSE_STATUS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
};

export function AdminStatusBadge({
  kind,
  value,
  label,
}: {
  kind: 'license' | 'workspace' | 'claim' | 'course' | 'generic';
  value: string;
  /** Override display text */
  label?: string;
}) {
  const map =
    kind === 'license'
      ? LICENSE_STATUS
      : kind === 'workspace'
        ? WORKSPACE_STATUS
        : kind === 'claim'
          ? CLAIM_STATUS
          : kind === 'course'
            ? COURSE_STATUS
            : {};
  const variant = map[value] ?? 'secondary';
  return <Badge variant={variant}>{label ?? value.replace(/_/g, ' ')}</Badge>;
}
