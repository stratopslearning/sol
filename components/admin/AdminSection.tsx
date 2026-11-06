import type { ReactNode } from 'react';

import { SectionHeading } from '@/components/layout/SectionHeading';
import { cn } from '@/lib/utils';

/**
 * Consistent admin section rhythm: mt-10 first / mt-14 subsequent.
 */
export function AdminSection({
  eyebrow,
  title,
  description,
  actions,
  children,
  first = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Use tighter top margin for the first section under PageHeader */
  first?: boolean;
  className?: string;
}) {
  return (
    <section className={cn(first ? 'mt-10' : 'mt-14', 'flex flex-col gap-4', className)}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </section>
  );
}
