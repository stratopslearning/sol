import Link from 'next/link';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { cn } from '@/lib/utils';

export type SectionHubTab = 'overview' | 'books' | 'assignments' | 'grades';

const TABS: { id: SectionHubTab; label: string; suffix: string }[] = [
  { id: 'overview', label: 'Overview', suffix: '' },
  { id: 'books', label: 'Books', suffix: '/books' },
  { id: 'assignments', label: 'Assignments', suffix: '/assignments' },
  { id: 'grades', label: 'Grades', suffix: '/grades' },
];

export function SectionHubShell({
  sectionId,
  sectionName,
  courseTitle,
  description,
  activeTab,
  actions,
  user,
  children,
}: {
  sectionId: string;
  sectionName: string;
  courseTitle: string;
  description?: string;
  activeTab: SectionHubTab;
  actions?: ReactNode;
  /** @deprecated Unused — kept optional so call sites can drop it gradually. */
  instructorUnverified?: boolean;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    paid?: boolean | null;
  };
  children: ReactNode;
}) {
  const base = `/dashboard/student/sections/${sectionId}`;
  const title = `${courseTitle} · ${sectionName}`;

  return (
    <AppShell
      role="student"
      active="sections"
      user={user}
      topbarTitle={sectionName}
    >
      <PageHeader
        eyebrow="Section"
        title={title}
        description={description}
        breadcrumbs={[
          {
            label: 'Sections',
            href: withBasePath('/dashboard/student/sections'),
          },
          { label: sectionName },
        ]}
        actions={actions}
      />

      <nav
        className="mt-6 flex flex-wrap gap-1 border-b border-rule/70"
        aria-label="Section"
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
