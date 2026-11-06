import Link from 'next/link';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ArrowUpRight, BookOpen, CreditCard, Users } from '@/components/icons';

import { CodeChip } from '@/app/dashboard/workspace/CodeChip';
import { CreateCourseForm } from '@/app/dashboard/workspace/CreateCourseForm';
import { CreateSectionForm } from '@/app/dashboard/workspace/CreateSectionForm';
import { AccessRequestsPanel } from '@/app/dashboard/workspace/AccessRequestsPanel';
import { InviteFacultyForm } from '@/app/dashboard/workspace/InviteFacultyForm';
import { FacultyCsvImportForm } from '@/components/workspace/FacultyCsvImportForm';
import { TransferOwnershipForm } from '@/components/workspace/TransferOwnershipForm';
import { listPendingAccessRequests } from '@/lib/workspace/accessRequests';
import { authorize } from '@/lib/authz/authorize';
import { WorkspaceBillingButton } from '@/app/dashboard/workspace/WorkspaceBillingButton';
import { WorkspaceExportButton } from '@/app/dashboard/workspace/WorkspaceExportButton';
import {
  RemoveMemberButton,
  RevokeInviteButton,
} from '@/app/dashboard/workspace/WorkspaceTeamActions';
import { db } from '@/app/db';
import {
  workspaceInvites,
  workspaceMemberships,
} from '@/app/db/schema';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { StatCard } from '@/components/patterns/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocalDateTime } from '@/components/timezone/LocalDateTime';
import { appPath, withBasePath } from '@/lib/basePath';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import {
  assertWorkspaceAllowsCourseCreate,
  getActiveWorkspaceId,
  licenseHasOpenCompWindow,
  listActiveMembershipsForUser,
  userCanInviteWorkspaceFaculty,
} from '@/lib/workspace';
import {
  fetchWorkspaceActiveLearnerCount,
  fetchWorkspaceCoursesWithSections,
} from '@/lib/workspace/workspaceScopedReads';

export const dynamic = 'force-dynamic';

export default async function WorkspaceOwnerPage() {
  const user = await requireTeachingAccess();

  const memberships = await listActiveMembershipsForUser(user.id);
  const activeWorkspaceId = await getActiveWorkspaceId(user.id);
  const primary =
    memberships.find((m) => m.workspaceId === activeWorkspaceId) ?? memberships[0];
  const switcherOptions = memberships
    .filter((m) => m.workspace)
    .map((m) => ({ id: m.workspace!.id, name: m.workspace!.name }));
  const switcher =
    switcherOptions.length > 1 && primary?.workspace ? (
      <WorkspaceSwitcher
        memberships={switcherOptions}
        activeWorkspaceId={primary.workspace.id}
      />
    ) : null;

  if (!primary?.workspace) {
    return (
      <AppShell
        role="professor"
        active="workspace"
        topbarTitle="Workspace"
        topbarActions={switcher}
      >
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
            { label: 'Workspace' },
          ]}
          eyebrow="Tenant"
          title="No workspace yet"
          description="Ask your SOL contact to provision a workspace and send you a claim link."
        />
      </AppShell>
    );
  }

  const workspace = primary.workspace;
  const license = workspace.licenses?.[0];
  const [used, entitlement, workspaceCourses] = await Promise.all([
    fetchWorkspaceActiveLearnerCount(workspace.id),
    assertWorkspaceAllowsCourseCreate(workspace.id),
    fetchWorkspaceCoursesWithSections(workspace.id),
  ]);
  const hasLiveStripe =
    Boolean(license?.stripeSubscriptionId) && license?.status === 'active';
  const hasCompAccess = Boolean(license && licenseHasOpenCompWindow(license));
  const needsStripeBilling =
    (workspace.type === 'creator' || workspace.type === 'business') &&
    !hasLiveStripe;
  const isInvoice =
    workspace.type === 'department' || workspace.type === 'institution';

  const canInviteFaculty = primary
    ? await userCanInviteWorkspaceFaculty(user.id, primary.workspaceId)
    : false;

  const canTransferOwnership = await authorize(user, 'ownership.transfer', {
    tenantId: workspace.id,
    scopeType: 'organization',
    scopeId: workspace.id,
  });

  const {
    fetchWorkspaceTeamMembers,
    fetchWorkspacePendingInvites,
  } = await import('@/lib/db/facultyStudentReads');
  const facultyMembers = canInviteFaculty
    ? await fetchWorkspaceTeamMembers(workspace.id)
    : [];

  const pendingFacultyInvites = canInviteFaculty
    ? await fetchWorkspacePendingInvites(workspace.id)
    : [];
  const openInvites = pendingFacultyInvites.filter(
    (i) => i.expiresAt.getTime() > Date.now() && i.role !== 'owner',
  );
  const accessRequests = canInviteFaculty
    ? await listPendingAccessRequests(workspace.id, user.id)
    : [];

  const seatCap = license?.seatCap ?? 0;
  const billingLabel = isInvoice
    ? 'Invoiced'
    : hasLiveStripe
      ? 'Stripe active'
      : hasCompAccess
        ? 'Complimentary'
        : needsStripeBilling
          ? 'Billing needed'
          : license?.status ?? '—';

  const createDisabledReason = entitlement.ok
    ? undefined
    : entitlement.code === 'billing_required'
      ? hasCompAccess
        ? entitlement.reason
        : 'Complete billing in the sidebar before creating courses.'
      : entitlement.reason;

  return (
    <AppShell
      role="professor"
      active="workspace"
      topbarTitle="Workspace"
      topbarActions={switcher}
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          { label: 'Workspace' },
        ]}
        eyebrow="Workspace"
        title={workspace.name}
        description={`${workspace.type} · ${workspace.slug}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canInviteFaculty ? (
              <WorkspaceExportButton workspaceId={workspace.id} />
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={appPath('/dashboard/workspace/knowledge')}>
                Knowledge
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={appPath('/dashboard/workspace/lti')}>
                LTI
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={appPath('/dashboard/workspace/audit')}>
                Audit
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={appPath('/dashboard/professor/courses')}>
                Open courses
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="License"
          value={license?.plan ?? '—'}
          hint={
            <>
              {billingLabel}
              {license?.billingProvider ? ` · ${license.billingProvider}` : ''}
            </>
          }
          icon={<CreditCard className="h-4 w-4" />}
          accent={needsStripeBilling && !hasCompAccess}
        />
        <StatCard
          label="Seats"
          value={
            <>
              {used.toLocaleString()}
              <span className="text-[0.55em] font-normal text-ink-faint">
                {' '}
                / {seatCap.toLocaleString()}
              </span>
            </>
          }
          hint="Active learners"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Courses"
          value={workspaceCourses.length}
          hint="In this workspace"
          icon={<BookOpen className="h-4 w-4" />}
        />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Primary: courses */}
        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Courses</p>
              <h2 className="mt-1 font-display text-2xl tracking-tight text-ink">
                Courses &amp; sections
              </h2>
            </div>
          </div>

          <CreateCourseForm
            workspaceId={workspace.id}
            disabled={!entitlement.ok}
            disabledReason={createDisabledReason}
            defaultOpen={workspaceCourses.length === 0 && entitlement.ok}
            redirectToCourseHub
          />

          {workspaceCourses.length === 0 ? (
            <EmptyState
              eyebrow="Empty"
              title="No courses yet"
              description="Create a course to open its hub — materials, authoring, and sections with enrollment codes."
            />
          ) : (
            <ul className="space-y-5">
              {workspaceCourses.map((c) => (
                <li
                  key={c.id}
                  className="overflow-hidden rounded-2xl border border-rule/80 bg-surface paper-shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule/60 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl tracking-tight text-ink">
                        <Link
                          href={appPath(`/dashboard/professor/courses/${c.id}`)}
                          className="transition-colors hover:text-brand"
                        >
                          {c.title}
                        </Link>
                      </h3>
                      {c.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                          {c.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {c.status}
                      </Badge>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={appPath(`/dashboard/professor/courses/${c.id}`)}
                        >
                          Course hub
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="px-5 py-4 sm:px-6">
                    {c.sections.length > 0 ? (
                      <ul className="divide-y divide-rule/50">
                        {c.sections.map((s) => (
                          <li
                            key={s.id}
                            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link
                                href={appPath(
                                  `/dashboard/professor/sections/${s.id}`,
                                )}
                                className="font-medium text-ink transition-colors hover:text-brand"
                              >
                                {s.name}
                              </Link>
                              <Button asChild variant="ghost" size="sm">
                                <Link
                                  href={appPath(
                                    `/dashboard/professor/sections/${s.id}`,
                                  )}
                                >
                                  Open
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <CodeChip
                                label="Faculty"
                                code={s.professorEnrollmentCode}
                              />
                              <CodeChip
                                label="Learner"
                                code={s.studentEnrollmentCode}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-2 text-sm text-ink-muted">
                        No sections yet — add one to start inviting learners.
                      </p>
                    )}

                    {entitlement.ok ? (
                      <div className="mt-3 border-t border-rule/50 pt-3">
                        <CreateSectionForm
                          courseId={c.id}
                          courseTitle={c.title}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Aside: billing + team */}
        <aside className="space-y-5 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-rule/80 bg-surface paper-shadow p-5">
            <p className="eyebrow">Plan</p>
            <h2 className="mt-1 font-display text-lg tracking-tight text-ink">
              Billing
            </h2>
            <div className="mt-4 space-y-3 text-sm text-ink-muted">
              {isInvoice ? (
                <p>
                  Campus plans are invoiced by SOL
                  {license?.status === 'active' ? ' · license active' : ''}.
                </p>
              ) : hasLiveStripe ? (
                <p>Stripe subscription is active for this workspace.</p>
              ) : (
                <>
                  {hasCompAccess && license?.periodEnd ? (
                    <p>
                      Complimentary access until{' '}
                      <LocalDateTime value={license.periodEnd} dateOnly />.
                    </p>
                  ) : null}
                  {needsStripeBilling ? (
                    <div className="space-y-3">
                      <p>
                        Complete Checkout to keep creating courses after the
                        trial window.
                      </p>
                      <WorkspaceBillingButton workspaceId={workspace.id} />
                    </div>
                  ) : (
                    <p>No action needed right now.</p>
                  )}
                </>
              )}
            </div>
          </div>

          {canInviteFaculty ? (
            <div className="rounded-2xl border border-rule/80 bg-surface paper-shadow p-5">
              <p className="eyebrow">Team</p>
              <h2 className="mt-1 font-display text-lg tracking-tight text-ink">
                Faculty
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
                Invite colleagues with an email-bound claim link. Students still
                join via section codes.
              </p>

              <div className="mt-4">
                <InviteFacultyForm workspaceId={workspace.id} />
                <FacultyCsvImportForm workspaceId={workspace.id} />
              </div>

              <div className="mt-5 border-t border-rule/60 pt-4">
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Access requests
                </p>
                <AccessRequestsPanel
                  workspaceId={workspace.id}
                  initialRequests={accessRequests.map((r) => ({
                    id: r.id,
                    email: r.email,
                    name: r.name,
                    claimedRole: r.claimedRole,
                    createdAt: r.createdAt,
                  }))}
                />
              </div>

              {canTransferOwnership ? (
                <div className="mt-4">
                  <TransferOwnershipForm
                    workspaceId={workspace.id}
                    candidates={facultyMembers
                      .filter((m) => m.userId !== user.id)
                      .map((m) => ({
                        userId: m.userId,
                        label: m.user?.email ?? m.userId,
                      }))}
                  />
                </div>
              ) : null}

              {facultyMembers.length > 0 ? (
                <ul className="mt-5 divide-y divide-rule/60 border-t border-rule/60">
                  {facultyMembers.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-ink">
                          {m.user?.email ?? m.userId}
                        </p>
                        <p className="text-[0.65rem] uppercase tracking-[0.06em] text-ink-faint">
                          Member
                        </p>
                      </div>
                      {m.userId !== user.id ? (
                        <RemoveMemberButton
                          workspaceId={workspace.id}
                          membershipId={m.id}
                          label={m.user?.email ?? 'member'}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {openInvites.length > 0 ? (
                <div className="mt-4 border-t border-rule/60 pt-4">
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                    Pending
                  </p>
                  <ul className="mt-2 space-y-2.5">
                    {openInvites.map((i) => (
                      <li
                        key={i.id}
                        className="flex items-start justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-ink">{i.email}</p>
                          <p className="text-xs text-ink-faint">
                            {i.role} · expires{' '}
                            <LocalDateTime value={i.expiresAt} dateOnly />
                          </p>
                        </div>
                        <RevokeInviteButton
                          workspaceId={workspace.id}
                          inviteId={i.id}
                          email={i.email}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {memberships.length > 1 ? (
            <div className="rounded-2xl border border-rule/70 bg-surface-sunken/40 px-5 py-4">
              <p className="eyebrow">Also a member of</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                {memberships.slice(1).map((m) => (
                  <li key={m.id}>
                    {m.workspace?.name}{' '}
                    <span className="text-ink-faint">(member)</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
