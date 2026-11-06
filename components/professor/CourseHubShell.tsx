import Link from 'next/link';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { cn } from '@/lib/utils';

export type CourseHubTab =
  | 'overview'
  | 'sections'
  | 'analytics'
  | 'insights';

const TABS: { id: CourseHubTab; label: string; suffix: string }[] = [
  { id: 'overview', label: 'Overview', suffix: '' },
  { id: 'sections', label: 'Sections', suffix: '/sections' },
  { id: 'analytics', label: 'Analytics', suffix: '/analytics' },
  { id: 'insights', label: 'Insights', suffix: '/insights' },
];

export function CourseHubShell({
  courseId,
  courseTitle,
  description,
  activeTab,
  actions,
  children,
}: {
  courseId: string;
  courseTitle: string;
  description?: string;
  activeTab: CourseHubTab;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const base = `/dashboard/professor/courses/${courseId}`;

  return (
    <AppShell role="professor" active="courses" topbarTitle={courseTitle}>
      <PageHeader
        eyebrow="Course"
        title={courseTitle}
        description={description}
        breadcrumbs={[
          {
            label: 'Courses',
            href: withBasePath('/dashboard/professor/courses'),
          },
          { label: courseTitle },
        ]}
        actions={actions}
      />

      <nav
        className="mt-6 flex flex-wrap gap-1 border-b border-rule/70"
        aria-label="Course sections"
      >
        {TABS.map((tab) => {
          const href = withBasePath(`${base}${tab.suffix}`);
          const isActive = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                'relative px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'font-medium text-ink'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {tab.label}
              {isActive ? (
                <span
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">{children}</div>
    </AppShell>
  );
}
