import { Building2, CreditCard, Mail, Layers } from '@/components/icons';

import { WorkspacesClient } from '@/app/dashboard/admin/workspaces/WorkspacesClient';
import {
  WorkspacesDirectory,
  type WorkspaceDirectoryRow,
} from '@/app/dashboard/admin/workspaces/WorkspacesDirectory';
import { AdminSection } from '@/components/admin/AdminSection';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { StatCard } from '@/components/patterns/StatCard';
import { fetchAdminWorkspaceDirectory } from '@/lib/admin/platformReads';
import { requireAdmin } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';
import { DEFAULT_WORKSPACE_ID } from '@/lib/workspace';

export default async function AdminWorkspacesPage() {
  const admin = await requireAdmin();
  const rows = await fetchAdminWorkspaceDirectory();

  const byType = {
    creator: rows.filter((w) => w.type === 'creator').length,
    business: rows.filter((w) => w.type === 'business').length,
    department: rows.filter((w) => w.type === 'department').length,
    institution: rows.filter((w) => w.type === 'institution').length,
  };
  const unpaid = rows.filter(
    (w) =>
      w.billingProvider === 'stripe' &&
      (w.licenseStatus === 'trialing' || !w.licenseStatus),
  ).length;
  const openInvites = rows.reduce((n, w) => n + w.openInviteCount, 0);
  const clientOnly = rows.filter((w) => w.id !== DEFAULT_WORKSPACE_ID);
  const institutions = rows.filter((w) => w.type === 'institution');

  const directoryRows: WorkspaceDirectoryRow[] = rows.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    type: w.type,
    status: w.status,
    createdAt: w.createdAt,
    seatCap: w.seatCap,
    licensePlan: w.licensePlan,
    licenseStatus: w.licenseStatus,
    billingProvider: w.billingProvider,
    ownerEmail: w.ownerEmail,
    claimStatus: w.claimStatus,
    courseCount: w.courseCount,
    childCount: w.childCount,
    isDefault: w.id === DEFAULT_WORKSPACE_ID,
    alreadyChurned: w.status === 'churned',
    licensePeriodEnd: w.licensePeriodEnd
      ? w.licensePeriodEnd.toISOString()
      : null,
  }));

  return (
    <AppShell
      role="admin"
      active="workspaces"
      topbarTitle="Workspaces"
      user={{
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
      }}
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', href: withBasePath('/dashboard/admin') },
          { label: 'Workspaces' },
        ]}
        eyebrow="Tenancy"
        title="Workspaces"
        description="Provision tenants, invite owners, track claims and licenses. Clients never get platform admin."
      />

      <AdminSection first eyebrow="Health" title="Tenant snapshot">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total"
            value={rows.length}
            hint={`${clientOnly.length} client tenants`}
            icon={<Layers className="h-4 w-4" />}
          />
          <StatCard
            label="By type"
            value={`${byType.creator + byType.business} / ${byType.department + byType.institution}`}
            hint="Self-serve · campus"
            icon={<Building2 className="h-4 w-4" />}
          />
          <StatCard
            label="Awaiting Stripe"
            value={unpaid}
            hint="Creator / Business"
            icon={<CreditCard className="h-4 w-4" />}
            accent={unpaid > 0}
          />
          <StatCard
            label="Open invites"
            value={openInvites}
            hint="Unclaimed owner links"
            icon={<Mail className="h-4 w-4" />}
            accent={openInvites > 0}
          />
        </div>
      </AdminSection>

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)] lg:items-start">
        <AdminSection
          first
          className="!mt-0"
          eyebrow="Directory"
          title="All workspaces"
          description="Filter by type or billing. Owner email comes from active membership or latest invite."
        >
          {clientOnly.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              eyebrow="No client tenants"
              title="Only the default workspace exists."
              description="Use the provision form to create a Creator, Business, Department, or Institution workspace and invite the owner by email."
            />
          ) : null}
          <WorkspacesDirectory rows={directoryRows} />
        </AdminSection>

        <AdminSection
          first
          className="!mt-0 lg:sticky lg:top-6"
          eyebrow="Provision"
          title="Add a workspace"
          description="Set type, tier, and owner email. Share the claim link — they pay (if Stripe) and create courses."
        >
          <WorkspacesClient
            parentOptions={institutions.map((i) => ({
              id: i.id,
              name: i.name,
            }))}
          />
        </AdminSection>
      </div>
    </AppShell>
  );
}
