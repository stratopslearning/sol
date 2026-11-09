import Link from 'next/link';
import { ArrowRight, BookOpen, Layers } from '@/components/icons';

import { CreateCourseForm } from '@/app/dashboard/workspace/CreateCourseForm';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { Button } from '@/components/ui/button';
import { TeachingPaywallBanner } from '@/components/workspace/TeachingPaywallBanner';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { appPath, withBasePath } from '@/lib/basePath';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { listTeachableCourses } from '@/lib/knowledge';
import {
  assertWorkspaceAllowsCourseCreate,
  getActiveWorkspaceId,
  listActiveMembershipsForUser,
} from '@/lib/workspace';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProfessorCoursesPage() {
  const user = await requireTeachingAccess();

  const [courses, memberships] = await Promise.all([
    listTeachableCourses(user),
    listActiveMembershipsForUser(user.id),
  ]);
  const activeWorkspaceId = await getActiveWorkspaceId(user.id);
  const primary =
    memberships.find((m) => m.workspaceId === activeWorkspaceId) ??
    memberships[0];
  const workspaceId = primary?.workspaceId;
  const workspaceName = primary?.workspace?.name;
  const switcherOptions = memberships
    .filter((m) => m.workspace)
    .map((m) => ({ id: m.workspace!.id, name: m.workspace!.name }));
  const switcher =
    workspaceId && switcherOptions.length > 0 ? (
      <WorkspaceSwitcher
        memberships={switcherOptions}
        activeWorkspaceId={workspaceId}
      />
    ) : null;

  const entitlement = workspaceId
    ? await assertWorkspaceAllowsCourseCreate(workspaceId)
    : {
        ok: false as const,
        reason: 'Create or join a workspace first.',
        code: 'license_inactive' as const,
      };

  const canCreate = Boolean(workspaceId && entitlement.ok);
  const empty = courses.length === 0;
  const totalSections = courses.reduce((n, c) => n + c.sectionCount, 0);

  return (
    <AppShell
      role="professor"
      active="courses"
      topbarTitle="Courses"
      topbarActions={switcher}
    >
      <PageHeader
        breadcrumbs={[
          {
            label: 'Dashboard',
            href: withBasePath('/dashboard/professor'),
          },
          { label: 'Courses' },
        ]}
        eyebrow="Teaching"
        title="Courses"
        description={
          workspaceName
            ? `In ${workspaceName}. Open a course for sections, analytics, and insights. Knowledge, authoring, and assignments live in the sidebar.`
            : 'Open a course for sections, analytics, and insights. Knowledge, authoring, and assignments live in the sidebar.'
        }
      />

      {workspaceId &&
      !entitlement.ok &&
      entitlement.code === 'billing_required' ? (
        <div className="mt-6">
          <TeachingPaywallBanner
            workspaceId={workspaceId}
            reason={
              entitlement.reason.includes('Pilot ended')
                ? entitlement.reason
                : 'Pilot ended. Finish billing to keep teaching, or ask SOL to restore access.'
            }
          />
        </div>
      ) : null}

      {!workspaceId ? (
        <EmptyState
          className="mt-12 animate-fade-in"
          icon={<Layers className="h-5 w-5" />}
          eyebrow="Workspace"
          title="No workspace yet"
          description="Claim an invite or finish onboarding, then come back to create your first course."
          actions={
            <>
              <Button asChild>
                <Link href={appPath('/onboarding')}>Get started</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={appPath('/dashboard/workspace')}>
                  Open workspace
                </Link>
              </Button>
            </>
          }
        />
      ) : empty ? (
        <div className="mt-12 max-w-2xl animate-fade-in">
          <EmptyState
            variant="bare"
            className="items-start px-0 py-0 text-left"
            eyebrow="First course"
            title="Start teaching here"
            description={
              canCreate
                ? 'Name the course, keep the default section, and you get faculty and learner codes right away.'
                : !entitlement.ok && entitlement.code === 'billing_required'
                  ? 'Pilot ended. Finish billing to keep teaching, or ask SOL to restore access.'
                  : !entitlement.ok
                    ? entitlement.reason
                    : 'Create or join a workspace first.'
            }
          />
          {canCreate ? (
            <div className="mt-8">
              <CreateCourseForm
                workspaceId={workspaceId}
                defaultOpen
                redirectToCourseHub
              />
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={appPath('/dashboard/workspace')}>
                  {!entitlement.ok && entitlement.code === 'billing_required'
                    ? 'Finish billing'
                    : 'Open workspace'}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={appPath('/dashboard/home')}>Switch workspace</Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-10 animate-fade-in">
          <div className="max-w-3xl">
            {canCreate ? (
              <CreateCourseForm
                workspaceId={workspaceId}
                redirectToCourseHub
              />
            ) : (
              <p className="rounded-xl border border-rule/80 bg-surface-sunken/40 px-4 py-3 text-sm text-ink-muted">
                {!entitlement.ok
                  ? entitlement.reason
                  : 'Create or join a workspace first.'}{' '}
                <Link
                  href={appPath('/dashboard/workspace')}
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  Open workspace
                </Link>
              </p>
            )}
          </div>

          <SectionHeading
            className="mt-12"
            eyebrow="Library"
            title={
              <>
                {courses.length} course{courses.length === 1 ? '' : 's'}
                <span className="text-ink-muted font-normal">
                  {' '}
                  · {totalSections} section{totalSections === 1 ? '' : 's'}
                </span>
              </>
            }
            description="Each course hub holds sections, analytics, and insights. Use Knowledge, Authoring, and Assignments from the sidebar."
          />

          <ul className="mt-6 flex max-w-3xl flex-col gap-2">
            {courses.map((course, index) => (
              <li
                key={course.id}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                className="animate-fade-in"
              >
                <Link
                  href={appPath(`/dashboard/professor/courses/${course.id}`)}
                  className={cn(
                    'group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-rule/70 bg-surface px-4 py-4 transition-all duration-200',
                    'hover:border-rule-strong hover:bg-surface-elevated sm:px-5',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-brand/0 transition-all duration-200 group-hover:bg-brand group-hover:w-1"
                  />
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rule bg-surface-sunken text-ink-muted transition-colors duration-200 group-hover:border-brand/30 group-hover:bg-brand-soft group-hover:text-brand">
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">
                      {course.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                      <span className="inline-flex items-center gap-1 rounded-md border border-rule/80 bg-surface-sunken/60 px-1.5 py-0.5">
                        <Layers className="h-3 w-3" aria-hidden />
                        {course.sectionCount} section
                        {course.sectionCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-ink-faint/80">
                        Sections · analytics · insights
                      </span>
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-ink-faint transition-colors group-hover:text-brand">
                    <span className="hidden sm:inline">Open</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
