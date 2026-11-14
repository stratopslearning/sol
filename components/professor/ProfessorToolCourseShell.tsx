import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { PageHeader } from '@/components/layout/PageHeader';
import { CourseSwitcher } from '@/components/professor/CourseSwitcher';
import { withBasePath } from '@/lib/basePath';
import type { TeachableCourse } from '@/lib/knowledge';

export function ProfessorToolCourseShell({
  active,
  toolLabel,
  toolHref,
  courseId,
  courseTitle,
  description,
  teachable,
  hrefTemplate,
  compactHeader = false,
  flush = false,
  children,
}: {
  active: string;
  toolLabel: string;
  toolHref: string;
  courseId: string;
  courseTitle: string;
  description?: string;
  teachable: TeachableCourse[];
  /** Path with `{courseId}` — must be a string (Client Components cannot take functions). */
  hrefTemplate: string;
  /** Breadcrumbs + switcher only — for chat-first surfaces like Authoring. */
  compactHeader?: boolean;
  /** Full-bleed canvas under the top bar. */
  flush?: boolean;
  children: ReactNode;
}) {
  const switcher = (
    <CourseSwitcher
      courses={teachable.map((c) => ({ id: c.id, title: c.title }))}
      activeCourseId={courseId}
      hrefTemplate={hrefTemplate}
    />
  );

  return (
    <AppShell
      role="professor"
      active={active}
      topbarTitle={toolLabel}
      topbarActions={switcher}
      maxWidth={flush ? 'full' : 'default'}
      flush={flush}
    >
      {compactHeader ? (
        flush ? null : (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Breadcrumbs
              items={[
                {
                  label: 'Dashboard',
                  href: withBasePath('/dashboard/professor'),
                },
                { label: toolLabel, href: withBasePath(toolHref) },
                { label: courseTitle },
              ]}
            />
            <div className="sm:pt-0.5">{switcher}</div>
          </div>
        )
      ) : (
        <PageHeader
          breadcrumbs={[
            {
              label: 'Dashboard',
              href: withBasePath('/dashboard/professor'),
            },
            { label: toolLabel, href: withBasePath(toolHref) },
            { label: courseTitle },
          ]}
          eyebrow={toolLabel}
          title={courseTitle}
          description={description}
        />
      )}
      <div
        className={
          flush
            ? 'flex min-h-0 flex-1 flex-col'
            : compactHeader
              ? 'mt-2'
              : 'mt-8'
        }
      >
        {children}
      </div>
    </AppShell>
  );
}
